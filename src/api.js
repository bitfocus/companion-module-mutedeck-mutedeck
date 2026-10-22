import WebSocket from 'ws'
import { InstanceStatus } from '@companion-module/base'
import { MuteDeckClient, osFromPlatform, sanitizeVersion } from '@mutedeck/plugin-client'

import pkg from '../package.json' with { type: 'json' }

/**
 * How this module introduces itself to MuteDeck (plugin protocol v2). The id
 * is also the usage-stats source; the name is shown in MuteDeck's approval
 * prompt and in its list of connected plugins.
 */
export const CLIENT_ID = 'companion'
export const CLIENT_NAME = 'Bitfocus Companion'
/** `source` sent to an old MuteDeck that only speaks protocol v1. */
export const V1_SOURCE = 'plugin'

const DEFAULT_PORT = 3492

/**
 * Connection to MuteDeck through the MuteDeck plugin SDK (`MuteDeckClient`).
 *
 * The SDK speaks protocol v2 (`ws://<host>:<port>/v2`: hello, approval prompt
 * in MuteDeck, token) and falls back to v1 (`identify` + `source`) when the
 * MuteDeck version is too old. It reconnects with backoff by itself. This
 * class forwards its events to the instance.
 */
export class MuteDeckConnection {
	constructor(instance) {
		this.instance = instance

		const host = (instance.config.host || 'localhost').trim()
		const port = Number(instance.config.port) || DEFAULT_PORT
		this.address = `${host}:${port}`

		const client = { id: CLIENT_ID, name: CLIENT_NAME, host_app: 'companion' }
		const version = sanitizeVersion(pkg.version)
		if (version) client.version = version
		const os = osFromPlatform(process.platform)
		if (os) client.os = os
		// @companion-module/base 2.x doesn't tell a module which Companion
		// version runs it, so `host_version` is left out.

		this.client = new MuteDeckClient({
			client,
			role: 'controller',
			host,
			port,
			v1Source: V1_SOURCE,
			webSocketFactory: (url) => new WebSocket(url),
			tokenStore: instance.tokenStore,
			logger: {
				debug: (message, ...args) => instance.log('debug', format(message, args)),
				info: (message, ...args) => instance.log('info', format(message, args)),
				warn: (message, ...args) => instance.log('warn', format(message, args)),
				error: (message, ...args) => instance.log('error', format(message, args)),
			},
		})

		this.unsubscribe = [
			this.client.on('state', (state, previous) => this.handleState(state, previous)),
			this.client.on('status', (status) => this.instance.onStatusUpdate(status)),
			this.client.on('customActions', (list) => this.instance.onCustomActions(list)),
			this.client.on('approved', () => this.instance.log('info', 'MuteDeck approved this Companion connection')),
		]
	}

	/** True while actions can be sent (approved, or connected to an old MuteDeck). */
	get isReady() {
		return this.client.isReady
	}

	/** The SDK connection state: connecting | pending | authenticated | denied | v1 | disconnected. */
	get state() {
		return this.client.state
	}

	connect() {
		this.instance.log('debug', `Connecting to MuteDeck at ${this.address}`)
		this.client.connect()
	}

	handleState(state, previous) {
		const self = this.instance
		switch (state) {
			case 'connecting':
				self.updateStatus(InstanceStatus.Connecting)
				break
			case 'pending':
				self.updateStatus(InstanceStatus.Connecting, 'Waiting for approval: click Allow in MuteDeck')
				break
			case 'authenticated':
				self.updateStatus(InstanceStatus.Ok)
				self.log('info', 'Connected to MuteDeck')
				break
			case 'v1':
				self.updateStatus(InstanceStatus.Ok, 'Older MuteDeck version (no approval needed)')
				self.log('info', 'Connected to MuteDeck (protocol v1)')
				// A v2 MuteDeck pushes the custom actions after approval; v1 has to be asked.
				this.requestCustomActions()
				break
			case 'denied':
				self.updateStatus(
					InstanceStatus.AuthenticationFailure,
					'Access denied in MuteDeck. It will ask again shortly; allow Companion to connect.',
				)
				break
			case 'disconnected':
				if (previous === 'authenticated' || previous === 'v1') {
					self.log('info', 'Disconnected from MuteDeck')
				}
				self.updateStatus(InstanceStatus.ConnectionFailure, 'Not connected to MuteDeck')
				break
		}
		self.onConnectionChange(this.client.isReady, state)
	}

	/**
	 * Send a MuteDeck action through the SDK, e.g. sendAction('toggle_mute', { state: 'on' }).
	 * Resolves true when MuteDeck accepted it (on an old MuteDeck: once it was sent).
	 */
	async sendAction(action, fields = {}) {
		if (!this.client.isReady) {
			this.instance.log('warn', `Ignored "${action}": ${notReadyReason(this.client.state)}`)
			return false
		}
		try {
			const response = await this.client.send(action, fields)
			if (response.status >= 400) {
				const reason = response.reason ?? response.message ?? ''
				this.instance.log('warn', `MuteDeck refused "${action}" (${response.status}${reason ? ` ${reason}` : ''})`)
				return false
			}
			return true
		} catch (e) {
			this.instance.log('warn', `"${action}" failed: ${e?.message ?? e}`)
			return false
		}
	}

	/** Ask MuteDeck for its custom actions; the answer arrives as a `customActions` event. */
	requestCustomActions() {
		if (!this.client.isReady) return
		this.client.listCustomActions().catch((e) => {
			this.instance.log('debug', `Could not list custom actions: ${e?.message ?? e}`)
		})
	}

	/** Forget the stored token and instance id, and ask MuteDeck for approval again. */
	resetPairing() {
		return this.client.resetPairing()
	}

	destroy() {
		for (const off of this.unsubscribe) off()
		this.unsubscribe = []
		this.client.disconnect()
	}
}

function notReadyReason(state) {
	if (state === 'pending') return 'waiting for approval in MuteDeck'
	if (state === 'denied') return 'MuteDeck denied access'
	return 'not connected to MuteDeck'
}

/** Join an SDK log message with its extra arguments. The SDK never passes tokens to its logger. */
function format(message, args) {
	if (args.length === 0) return message
	return `${message} ${args.map((a) => (typeof a === 'string' ? a : safeJson(a))).join(' ')}`
}

function safeJson(value) {
	if (value instanceof Error) return value.message
	try {
		return JSON.stringify(value)
	} catch {
		return String(value)
	}
}

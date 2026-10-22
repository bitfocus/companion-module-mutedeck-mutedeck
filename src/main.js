import { InstanceBase, InstanceStatus } from '@companion-module/base'

import { MuteDeckConnection } from './api.js'
import { GetConfigFields } from './config.js'
import { UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { UpdateVariableDefinitions, UpdateVariableValues } from './variables.js'
import { UpdatePresets } from './presets.js'
import { UpgradeScripts } from './upgrades.js'
import { STATUS_FIELDS, emptyStatus } from './state.js'

/**
 * @typedef {Object} ModuleConfig
 * @property {string} host
 * @property {string} port
 * @property {string} [mutedeck_instance_id] Hidden: this connection's MuteDeck instance id (not secret).
 */

/**
 * @typedef {Object} ModuleSecrets
 * @property {string} [mutedeck_token] Hidden: the token MuteDeck issued when the user approved this connection.
 */

class MuteDeckInstance extends InstanceBase {
	constructor(internal) {
		super(internal)

		/** Current MuteDeck state, mirrored from `update-status` messages. */
		this.state = { connected: false, auth: 'disconnected', ...emptyStatus() }
		/** Custom actions discovered from MuteDeck, used to populate the action dropdown. */
		this.customActions = []
		/** @type {MuteDeckConnection | null} */
		this.connection = null
		/** @type {ModuleSecrets} */
		this.secrets = {}

		/**
		 * Where the SDK keeps the MuteDeck token and instance id: the token in
		 * Companion's secrets store (its value is never sent to the web UI), the
		 * instance id in the connection config. Both are hidden config fields.
		 * @type {import('@mutedeck/plugin-client').TokenStore}
		 */
		this.tokenStore = {
			load: async () => ({
				token: this.secrets?.mutedeck_token || undefined,
				instanceId: this.config?.mutedeck_instance_id || undefined,
			}),
			save: async (data) => this.saveCredentials(data),
			clear: async () => this.saveCredentials({}),
		}
	}

	async init(config, _isFirstInit, secrets) {
		this.config = config
		this.secrets = secrets ?? {}
		this.state = { connected: false, auth: 'disconnected', ...emptyStatus() }

		this.updateActions()
		this.updateFeedbacks()
		this.updatePresets()
		this.updateVariableDefinitions()
		UpdateVariableValues(this)

		this.updateStatus(InstanceStatus.Connecting)
		this.connection = new MuteDeckConnection(this)
		this.connection.connect()
	}

	async destroy() {
		this.connection?.destroy()
		this.connection = null
	}

	async configUpdated(config, secrets) {
		const previous = this.config ?? {}
		const instanceId = previous.mutedeck_instance_id
		const token = this.secrets?.mutedeck_token
		this.config = config
		this.secrets = secrets ?? {}

		// The credentials are hidden fields; keep them should a save from the
		// web UI come back without them.
		if ((instanceId && !config.mutedeck_instance_id) || (token && !this.secrets.mutedeck_token)) {
			this.saveCredentials({
				instanceId: config.mutedeck_instance_id || instanceId,
				token: this.secrets.mutedeck_token || token,
			})
		}

		// Reconnect only when the address changed: saving the credentials
		// must not tear down the connection that just stored them.
		if (previous.host !== config.host || String(previous.port) !== String(config.port) || !this.connection) {
			this.connection?.destroy()
			this.connection = new MuteDeckConnection(this)
			this.connection.connect()
		}
	}

	/**
	 * Persist what the SDK's token store hands us. Only the parts that changed
	 * are saved; the token goes to the secrets store.
	 * @param {{ token?: string, instanceId?: string }} data
	 */
	saveCredentials({ token, instanceId }) {
		let newConfig
		let newSecrets
		if ((this.config?.mutedeck_instance_id || undefined) !== instanceId) {
			newConfig = { ...this.config, mutedeck_instance_id: instanceId ?? '' }
			this.config = newConfig
		}
		if ((this.secrets?.mutedeck_token || undefined) !== token) {
			newSecrets = { ...this.secrets, mutedeck_token: token ?? '' }
			this.secrets = newSecrets
		}
		if (newConfig || newSecrets) {
			this.saveConfig(newConfig, newSecrets)
		}
	}

	getConfigFields() {
		return GetConfigFields()
	}

	updateActions() {
		UpdateActions(this)
	}

	updateFeedbacks() {
		UpdateFeedbacks(this)
	}

	updatePresets() {
		UpdatePresets(this)
	}

	updateVariableDefinitions() {
		UpdateVariableDefinitions(this)
	}

	// --- Callbacks from the MuteDeck connection ---

	/**
	 * Called on every SDK connection state change. `connected` is true while
	 * actions can be sent (approved by MuteDeck, or an old MuteDeck).
	 */
	onConnectionChange(connected, auth) {
		this.state.connected = connected
		this.state.auth = auth
		if (!connected) {
			// Clear the per-capability states so feedbacks/variables reflect "unknown".
			this.state = { ...this.state, ...emptyStatus() }
		}
		UpdateVariableValues(this)
		this.checkAllFeedbacks()
	}

	/** Called with each `update-status` message from MuteDeck. */
	onStatusUpdate(msg) {
		for (const field of STATUS_FIELDS) {
			if (msg[field] !== undefined) {
				this.state[field] = msg[field]
			}
		}
		UpdateVariableValues(this)
		this.checkAllFeedbacks()
	}

	/** Called with the list of user-defined custom actions from MuteDeck. */
	onCustomActions(list) {
		this.customActions = list
		// Re-build actions so the custom-action dropdown shows the discovered names.
		this.updateActions()
	}
}

export default MuteDeckInstance
export { UpgradeScripts }

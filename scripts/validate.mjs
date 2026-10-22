/**
 * Static validation of the module definitions, runnable without the Companion
 * host. Builds every action/feedback/variable/preset against a mock instance,
 * exercises the callbacks, and validates the manifest with the official
 * validator. Run via `npm run check`; also runs in CI before packaging.
 */
import fs from 'fs'
import { UpdateActions } from '../src/actions.js'
import { UpdateFeedbacks } from '../src/feedbacks.js'
import { UpdateVariableDefinitions, UpdateVariableValues } from '../src/variables.js'
import { UpdatePresets } from '../src/presets.js'
import { GetConfigFields } from '../src/config.js'
import MuteDeckInstance, { UpgradeScripts } from '../src/main.js'
import { emptyStatus } from '../src/state.js'
import { validateManifest } from '@companion-module/base/manifest'

let failures = 0
const ok = (cond, msg) => {
	if (!cond) {
		failures++
		console.error('FAIL:', msg)
	}
}

// --- Manifest validation via the official validator ---
const manifest = JSON.parse(fs.readFileSync(new URL('../companion/manifest.json', import.meta.url)))
try {
	validateManifest(manifest, false)
} catch (e) {
	ok(false, `manifest failed validation: ${e.message}`)
}
ok(
	manifest.version === JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url))).version,
	'manifest version matches package.json version',
)

// --- Mock instance capturing definitions and outgoing MuteDeck actions ---
const sent = []
let resets = 0
const self = {
	state: { connected: true, auth: 'authenticated', ...emptyStatus() },
	customActions: [{ name: 'My Macro', app_types: ['zoom', 'teams'] }],
	config: { host: 'localhost', port: '3492' },
	log: () => {},
	connection: {
		sendAction: async (action, extra) => {
			sent.push({ action, ...extra })
			return true
		},
		requestCustomActions: () => {},
		resetPairing: async () => {
			resets++
		},
	},
}
self.updateActions = () => UpdateActions(self)

let actions, feedbacks, variableDefs, variableVals, presetStructure, presetMap
self.setActionDefinitions = (d) => (actions = d)
self.setFeedbackDefinitions = (d) => (feedbacks = d)
self.setVariableDefinitions = (d) => (variableDefs = d)
self.setVariableValues = (d) => (variableVals = d)
self.setPresetDefinitions = (structure, presets) => {
	presetStructure = structure
	presetMap = presets
}

UpdateActions(self)
UpdateFeedbacks(self)
UpdateVariableDefinitions(self)
UpdatePresets(self)
self.state.mute = 'active'
self.state.video = 'active'
UpdateVariableValues(self)

// --- Actions ---
const expectedActions = [
	'toggle_mute',
	'toggle_video',
	'toggle_share',
	'toggle_record',
	'leave_meeting',
	'bring_to_front',
	'custom_action',
	'refresh_custom_actions',
	'reset_pairing',
]
for (const id of expectedActions) ok(actions[id], `action defined: ${id}`)
for (const [id, def] of Object.entries(actions)) {
	ok(typeof def.name === 'string', `action ${id} has name`)
	ok(Array.isArray(def.options), `action ${id} has options array`)
	ok(typeof def.callback === 'function', `action ${id} has callback`)
}
ok(actions.custom_action.options[0].allowCustom === true, 'custom_action allows custom text')

await actions.toggle_mute.callback({ options: { state: 'on' } })
await actions.toggle_video.callback({ options: { state: 'toggle' } })
await actions.leave_meeting.callback({ options: {} })
await actions.bring_to_front.callback({ options: {} })
await actions.custom_action.callback({ options: { name: 'My Macro' } })
await actions.reset_pairing.callback({ options: {} })
ok(resets === 1, 'reset_pairing resets the MuteDeck approval')
ok(
	sent.some((m) => m.action === 'toggle_mute' && m.state === 'on'),
	'toggle_mute sends state',
)
ok(
	sent.some((m) => m.action === 'bring-to-front'),
	'bring_to_front sends bring-to-front action',
)
ok(
	sent.some((m) => m.action === 'custom-action' && m.name === 'My Macro'),
	'custom_action sends name',
)

// --- Feedbacks ---
const expectedFeedbacks = [
	'mic_status',
	'camera_status',
	'sharing_status',
	'recording_status',
	'call_status',
	'mutedeck_connected',
	'mutedeck_auth_state',
]
const expectedIconFeedbacks = ['mic_icon', 'camera_icon', 'share_icon', 'record_icon']
for (const id of expectedFeedbacks) ok(feedbacks[id], `feedback defined: ${id}`)
for (const id of expectedIconFeedbacks) ok(feedbacks[id], `icon feedback defined: ${id}`)
for (const [id, def] of Object.entries(feedbacks)) {
	ok(typeof def.callback === 'function', `feedback ${id} has callback`)
	if (def.type === 'boolean') {
		ok(def.defaultStyle && typeof def.defaultStyle === 'object', `feedback ${id} has defaultStyle`)
	} else {
		ok(def.type === 'advanced', `feedback ${id} is boolean or advanced`)
	}
}
ok(feedbacks.mic_status.callback({ options: { which: 'active' } }) === true, 'mic_status true when muted')
ok(feedbacks.mutedeck_connected.callback({ options: {} }) === true, 'mutedeck_connected true when connected')
ok(
	feedbacks.mutedeck_auth_state.callback({ options: { which: 'authenticated' } }) === true,
	'mutedeck_auth_state matches the current state',
)
ok(
	feedbacks.mutedeck_auth_state.callback({ options: { which: 'pending' } }) === false,
	'mutedeck_auth_state false for another state',
)

// Icon feedbacks must return a png64 + bgcolor for every state, and grey out when disconnected.
for (const id of expectedIconFeedbacks) {
	for (const value of ['active', 'inactive', 'disabled', '']) {
		self.state.mute = self.state.video = self.state.share = self.state.record = value
		const style = feedbacks[id].callback({ options: {} })
		ok(
			style && typeof style.png64 === 'string' && style.png64.length > 100,
			`icon feedback ${id} returns png64 for state "${value}"`,
		)
		ok(typeof style.bgcolor === 'number', `icon feedback ${id} returns bgcolor for state "${value}"`)
	}
}
self.state.connected = false
ok(
	typeof feedbacks.mic_icon.callback({ options: {} }).png64 === 'string',
	'mic_icon returns a (greyed) icon while disconnected',
)
self.state.connected = true
self.state.mute = 'active'
self.state.video = 'active'

// --- Variables ---
const declaredVarIds = new Set(Object.keys(variableDefs))
for (const id of Object.keys(variableVals)) ok(declaredVarIds.has(id), `variable value ${id} has a matching definition`)
ok(variableVals.mute_label === 'Muted', 'mute_label reflects active state')
ok(variableVals.auth_state === 'authenticated', 'auth_state reflects the SDK state')
ok(variableVals.auth_state_label === 'Approved', 'auth_state_label is a friendly label')

// --- Presets ---
const presetIds = new Set(Object.keys(presetMap))
const actionIds = new Set(Object.keys(actions))
const feedbackIds = new Set(Object.keys(feedbacks))
ok(Array.isArray(presetStructure), 'preset structure is an array')
for (const section of presetStructure) {
	for (const ref of section.definitions) ok(presetIds.has(ref), `preset structure ref "${ref}" exists`)
}
for (const [pid, preset] of Object.entries(presetMap)) {
	ok(preset.type === 'simple', `preset ${pid} type simple`)
	ok(preset.style && typeof preset.style.text === 'string', `preset ${pid} has style text`)
	for (const step of preset.steps) {
		for (const a of [...(step.down || []), ...(step.up || [])])
			ok(actionIds.has(a.actionId), `preset ${pid} references action ${a.actionId}`)
	}
	for (const f of preset.feedbacks) {
		ok(feedbackIds.has(f.feedbackId), `preset ${pid} references feedback ${f.feedbackId}`)
		if (feedbacks[f.feedbackId]?.type === 'boolean') {
			ok(f.style && typeof f.style === 'object', `preset ${pid} boolean feedback has style`)
		}
	}
}

// --- Config / exports ---
ok(
	GetConfigFields().every((f) => typeof f.width === 'number'),
	'config fields have width',
)
ok(typeof MuteDeckInstance === 'function', 'main default export is a class/function')
{
	const ids = GetConfigFields().map((f) => f.id)
	ok(ids.includes('host') && ids.includes('port'), 'config keeps host and port')
	const token = GetConfigFields().find((f) => f.id === 'mutedeck_token')
	ok(token?.type === 'secret-text', 'token is stored as a secret')
}
ok(Array.isArray(UpgradeScripts), 'UpgradeScripts is an array')

if (failures === 0) {
	console.log('All module validation checks passed.')
	process.exit(0)
} else {
	console.error(`\n${failures} validation check(s) failed.`)
	process.exit(1)
}

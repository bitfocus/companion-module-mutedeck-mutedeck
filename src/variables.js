import { AUTH_STATE_LABELS, StateValue, muteLabel, onOffLabel, callLabel } from './state.js'

/**
 * Declare the variables this module exposes. Values are pushed separately via
 * setVariableValues() from updateVariableValues().
 */
export function UpdateVariableDefinitions(self) {
	self.setVariableDefinitions({
		connected: { name: 'Connected to MuteDeck (true/false)' },
		connected_label: { name: 'Connection label (Connected / Offline)' },
		auth_state: {
			name: 'MuteDeck approval state (connecting/pending/authenticated/denied/v1/disconnected)',
		},
		auth_state_label: { name: 'MuteDeck approval label (Approved / Waiting for approval / Denied / ...)' },

		mute_status: { name: 'Microphone state (active/inactive/disabled)' },
		video_status: { name: 'Camera state (active/inactive/disabled)' },
		share_status: { name: 'Screen share state (active/inactive/disabled)' },
		record_status: { name: 'Recording state (active/inactive/disabled)' },
		call_status: { name: 'Call state (active/inactive/disabled)' },
		control_status: { name: 'MuteDeck control state (active/inactive/disabled)' },

		mute_label: { name: 'Microphone label (Muted / Unmuted / ...)' },
		video_label: { name: 'Camera label (On / Off / ...)' },
		share_label: { name: 'Screen share label (On / Off / ...)' },
		record_label: { name: 'Recording label (On / Off / ...)' },
		call_label: { name: 'Call label (In call / No call / ...)' },
	})
}

/** Push the current values for all variables based on self.state. */
export function UpdateVariableValues(self) {
	const s = self.state
	self.setVariableValues({
		connected: s.connected ? 'true' : 'false',
		connected_label: s.connected ? 'Connected' : 'Offline',
		auth_state: s.auth || 'disconnected',
		auth_state_label: AUTH_STATE_LABELS[s.auth] ?? AUTH_STATE_LABELS.disconnected,

		mute_status: s.mute || StateValue.UNKNOWN,
		video_status: s.video || StateValue.UNKNOWN,
		share_status: s.share || StateValue.UNKNOWN,
		record_status: s.record || StateValue.UNKNOWN,
		call_status: s.call || StateValue.UNKNOWN,
		control_status: s.control || StateValue.UNKNOWN,

		mute_label: muteLabel(s.mute),
		video_label: onOffLabel(s.video),
		share_label: onOffLabel(s.share),
		record_label: onOffLabel(s.record),
		call_label: callLabel(s.call),
	})
}

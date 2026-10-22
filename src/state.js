/**
 * MuteDeck reports each capability as one of these string values.
 * Unknown ('') is used before the first status arrives or while disconnected.
 */
export const StateValue = {
	ACTIVE: 'active',
	INACTIVE: 'inactive',
	DISABLED: 'disabled',
	UNKNOWN: '',
}

/** The status fields MuteDeck includes in an `update-status` message. */
export const STATUS_FIELDS = ['call', 'mute', 'video', 'record', 'share', 'control']

/** The default, empty status used at startup and on disconnect. */
export function emptyStatus() {
	return {
		call: StateValue.UNKNOWN,
		mute: StateValue.UNKNOWN,
		video: StateValue.UNKNOWN,
		record: StateValue.UNKNOWN,
		share: StateValue.UNKNOWN,
		control: StateValue.UNKNOWN,
	}
}

/** Human-readable label for the microphone state. */
export function muteLabel(v) {
	if (v === StateValue.ACTIVE) return 'Muted'
	if (v === StateValue.INACTIVE) return 'Unmuted'
	if (v === StateValue.DISABLED) return 'No mic'
	return 'Unknown'
}

/** Generic on/off label for video, share and record. */
export function onOffLabel(v) {
	if (v === StateValue.ACTIVE) return 'On'
	if (v === StateValue.INACTIVE) return 'Off'
	if (v === StateValue.DISABLED) return 'Disabled'
	return 'Unknown'
}

/** Label for the call state. */
export function callLabel(v) {
	if (v === StateValue.ACTIVE) return 'In call'
	if (v === StateValue.INACTIVE) return 'No call'
	if (v === StateValue.DISABLED) return 'Disabled'
	return 'Unknown'
}

/** Labels for the MuteDeck SDK's connection states (the `auth_state_label` variable). */
export const AUTH_STATE_LABELS = {
	connecting: 'Connecting',
	pending: 'Waiting for approval',
	authenticated: 'Approved',
	denied: 'Denied',
	v1: 'Legacy (no approval needed)',
	disconnected: 'Offline',
}

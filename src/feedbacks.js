import { combineRgb } from '@companion-module/base'

import { Icons } from './icons.js'
import { StateValue } from './state.js'

const WHITE = combineRgb(255, 255, 255)
const BLACK = combineRgb(0, 0, 0)
const RED = combineRgb(200, 0, 0)
const GREEN = combineRgb(0, 150, 60)
const GREY = combineRgb(80, 80, 80)
const DARK = combineRgb(30, 30, 30)
const BLUE = combineRgb(45, 140, 255)

/**
 * Build a boolean feedback that is true when a given status field equals the
 * value the user selected in the `which` dropdown.
 */
function statusFeedback(self, field, name, choices, defaultWhich, defaultStyle) {
	return {
		type: 'boolean',
		name,
		defaultStyle,
		options: [
			{
				type: 'dropdown',
				id: 'which',
				label: 'When state is',
				default: defaultWhich,
				choices,
			},
		],
		callback: (feedback) => self.state[field] === feedback.options.which,
	}
}

/**
 * Build a "live icon" feedback: a zero-configuration advanced feedback that
 * fully drives the button style (MuteDeck icon + background colour) from the
 * current state of one capability. Greyed out while not connected to MuteDeck.
 *
 * `styles` maps each StateValue to { png64, bgcolor }.
 */
function liveIconFeedback(self, field, name, styles, disabledIcon) {
	return {
		type: 'advanced',
		name,
		description:
			'Automatically shows the matching MuteDeck icon and colour for the current state. ' +
			'Greyed out while not connected to MuteDeck. No configuration needed.',
		options: [],
		callback: () => {
			if (!self.state.connected) {
				return { png64: disabledIcon, bgcolor: DARK, color: GREY }
			}
			const style = styles[self.state[field]]
			if (!style) {
				// Unknown state (no status received yet).
				return { png64: disabledIcon, bgcolor: DARK, color: GREY }
			}
			return { color: WHITE, ...style }
		},
	}
}

export function UpdateFeedbacks(self) {
	const onOff = [
		{ id: 'active', label: 'On' },
		{ id: 'inactive', label: 'Off' },
		{ id: 'disabled', label: 'Disabled' },
	]

	self.setFeedbackDefinitions({
		// --- Zero-config live icon feedbacks (used by the presets) ---
		mic_icon: liveIconFeedback(
			self,
			'mute',
			'Microphone: live icon',
			{
				[StateValue.ACTIVE]: { png64: Icons.mic_muted, bgcolor: RED },
				[StateValue.INACTIVE]: { png64: Icons.mic_unmuted, bgcolor: GREEN },
				[StateValue.DISABLED]: { png64: Icons.mic_disabled, bgcolor: BLACK },
			},
			Icons.mic_disabled,
		),
		camera_icon: liveIconFeedback(
			self,
			'video',
			'Camera: live icon',
			{
				[StateValue.ACTIVE]: { png64: Icons.video_on, bgcolor: GREEN },
				[StateValue.INACTIVE]: { png64: Icons.video_off, bgcolor: RED },
				[StateValue.DISABLED]: { png64: Icons.video_disabled, bgcolor: BLACK },
			},
			Icons.video_disabled,
		),
		share_icon: liveIconFeedback(
			self,
			'share',
			'Screen share: live icon',
			{
				[StateValue.ACTIVE]: { png64: Icons.share_on, bgcolor: RED },
				[StateValue.INACTIVE]: { png64: Icons.share_off, bgcolor: BLUE },
				[StateValue.DISABLED]: { png64: Icons.share_disabled, bgcolor: BLACK },
			},
			Icons.share_disabled,
		),
		record_icon: liveIconFeedback(
			self,
			'record',
			'Recording: live icon',
			{
				[StateValue.ACTIVE]: { png64: Icons.record_on, bgcolor: RED },
				[StateValue.INACTIVE]: { png64: Icons.record_off, bgcolor: BLUE },
				[StateValue.DISABLED]: { png64: Icons.record_disabled, bgcolor: BLACK },
			},
			Icons.record_disabled,
		),

		// --- Configurable boolean feedbacks ---
		mic_status: statusFeedback(
			self,
			'mute',
			'Microphone state',
			[
				{ id: 'active', label: 'Muted' },
				{ id: 'inactive', label: 'Unmuted' },
				{ id: 'disabled', label: 'No microphone' },
			],
			'active',
			{ bgcolor: RED, color: WHITE },
		),
		camera_status: statusFeedback(self, 'video', 'Camera state', onOff, 'active', { bgcolor: GREEN, color: WHITE }),
		sharing_status: statusFeedback(self, 'share', 'Screen share state', onOff, 'active', {
			bgcolor: GREEN,
			color: WHITE,
		}),
		recording_status: statusFeedback(self, 'record', 'Recording state', onOff, 'active', {
			bgcolor: RED,
			color: WHITE,
		}),
		call_status: statusFeedback(
			self,
			'call',
			'Call state',
			[
				{ id: 'active', label: 'In a call' },
				{ id: 'inactive', label: 'Not in a call' },
				{ id: 'disabled', label: 'Disabled' },
			],
			'active',
			{ bgcolor: GREEN, color: WHITE },
		),
		mutedeck_connected: {
			type: 'boolean',
			name: 'MuteDeck connection',
			description: 'True while this module is connected to the MuteDeck application.',
			defaultStyle: { bgcolor: GREY, color: WHITE },
			options: [],
			callback: () => self.state.connected === true,
		},
	})
}

import { Regex } from '@companion-module/base'

/**
 * Configuration fields shown in the Companion connection settings UI.
 */
export function GetConfigFields() {
	return [
		{
			type: 'static-text',
			id: 'info',
			width: 12,
			label: 'About this module',
			value:
				'Controls and monitors the MuteDeck desktop application running on this machine (or another machine on your network). ' +
				'MuteDeck must be installed and running. Get it from https://mutedeck.com.',
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'MuteDeck host',
			width: 8,
			default: 'localhost',
			tooltip: 'Hostname or IP where MuteDeck is running. Usually localhost.',
			regex: Regex.HOSTNAME,
		},
		{
			type: 'textinput',
			id: 'port',
			label: 'MuteDeck port',
			width: 4,
			default: '3492',
			tooltip: 'MuteDeck WebSocket port (default 3492).',
			regex: Regex.PORT,
		},
		{
			type: 'static-text',
			id: 'pairing_info',
			width: 12,
			label: 'Approval',
			value:
				'The first time this connection reaches MuteDeck, MuteDeck asks whether to allow Bitfocus Companion. ' +
				'Click Allow there. You can revoke access later in MuteDeck Settings; use the "Reset MuteDeck approval" action to ask again.',
		},
		// Hidden: written by the module when MuteDeck approves this connection.
		{
			type: 'textinput',
			id: 'mutedeck_instance_id',
			label: 'MuteDeck instance id',
			width: 12,
			default: '',
			isVisibleExpression: 'false',
		},
		{
			type: 'secret-text',
			id: 'mutedeck_token',
			label: 'MuteDeck token',
			width: 12,
			default: '',
			isVisibleExpression: 'false',
		},
	]
}

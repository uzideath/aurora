import { handleListener, handleRegistry, initiateCommands } from '#core';
import { LogLevel } from '#lib/enums';
import { Command, Listener, Logger } from '#lib/structures';
import { Client as DJSClient, Collection, GatewayIntentBits, Partials, ActivityType, TextChannel } from 'discord.js';
import { cyanBright, underline } from 'colorette';
import config from '#root/config';
import { Poru } from 'poru';

export class Client<Ready extends boolean = true> extends DJSClient<Ready> {
	public poru: Poru
	public constructor() {
		super({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.DirectMessages,
				GatewayIntentBits.MessageContent,
				GatewayIntentBits.GuildVoiceStates
			],
			partials: [Partials.Channel],
			presence: {
				status: 'dnd',
				activities: [
					{
						name: '/play',
						type: ActivityType.Listening,
					},
				],
			},
		});

		this.logger.setLevel(LogLevel.Debug);
		this.prefixes = ['!'];
		this.ownerIds = [''];
		this.restDebug = false;

		this.poru = new Poru(this, config.nodes, config.options)

		this.registerPoruEvents();
	}

	public prefixes: string[] = [];

	public ownerIds: string[] = [];

	public commands = new Collection<string, Command>();

	public listener = new Collection<string, Listener>();

	public logger: Logger = new Logger();

	public override async login(token?: string | undefined): Promise<string> {
		await Promise.all([handleRegistry(this as Client), handleListener(this as Client)]);

		const promiseString = await super.login(token);
		this.logger.info(`Logged in as ${cyanBright(underline(`${this.user?.tag}`))}`);
		this.poru.init()
		await initiateCommands(this as Client, {
			register: false,
			sync: false,
			shortcut: true,
		});

		return promiseString;
	}
	private registerPoruEvents() {
		this.poru.on('trackStart', (player, track) => {
			const channel = this.channels.cache.get(player.textChannel) as TextChannel;
			channel?.send(`Now playing \`${track.info.title}\``);
		});

		this.poru.on('trackEnd', (player, track) => {
			// const channel = this.channels.cache.get(player.textChannel) as TextChannel;
			// channel?.send(`Finished playing \`${track.info.title}\``);
		});

		this.poru.on('queueEnd', async (player) => {
			const channel = this.channels.cache.get(player.textChannel) as TextChannel;
			channel?.send('The queue has ended.');

			try {
				if (player.isAutoPlay) {
					const data = `https://www.youtube.com/watch?v=${player.previousTrack?.info?.identifier || player.currentTrack?.info?.identifier}&list=RD${player.previousTrack?.info.identifier || player.currentTrack?.info.identifier}`;

					const response = await player.poru.resolve({
						query: data,
						requester: player.previousTrack?.info?.requester ?? player.currentTrack?.info?.requester,
						source: player.previousTrack?.info?.sourceName ?? player.currentTrack?.info?.sourceName ?? player.poru.options?.defaultPlatform ?? "ytmsearch",
					});

					if (!response || !response.tracks || ["error", "empty"].includes(response.loadType)) {
						channel?.send('No tracks found for autoplay. The player will be idle.');
						return;
					}

					response.tracks.shift();

					const track = response.tracks[Math.floor(Math.random() * response.tracks.length)];
					player.queue.push(track);
					channel?.send(`Autoplay added a new track: \`${track.info.title}\``);

					if (!player.isPlaying) {
						await player.play();
						channel?.send(`Now playing: \`${track.info.title}\``);
					}
				}
			} catch (err) {
				console.error('Error handling queue end autoplay:', err);
				channel?.send('An error occurred while attempting to autoplay a new track.');
			}
		});


		this.poru.on('nodeDisconnect', (node) => {
			this.logger.warn(`Node ${node.name} has been disconnected.`)
		});

		this.poru.on('nodeError', (node, error) => {
			this.logger.warn(`Node ${node.name} just fired an error ${error}.`)
		});

		this.poru.on('trackError', (player, track, error) => {
			const channel = this.channels.cache.get(player.textChannel) as TextChannel;
			console.error(`Track exception for ${track.info.title}: ${error}`);
			channel?.send(
				`An error occurred while playing \`${track.info.title}\`: ${error}. Skipping...`
			);
			player.destroy();
		});

		this.poru.on('playerCreate', (player) => {
			// const channel = this.channels.cache.get(player.textChannel) as TextChannel;
			// channel?.send('Player successfully connected.');
			this.logger.info(`A new player was created on ${player.guildId}`)
		});

		this.poru.on('playerDestroy', (player) => {
			// const channel = this.channels.cache.get(player.textChannel) as TextChannel;
			// channel?.send('Player successfully connected.');
			this.logger.info(`A new player was destroyed on ${player.guildId}`)
		});


		this.poru.on('playerUpdate', (player) => {
			this.logger.info(`Player updated in guild: ${player.guildId}`);
		});


		this.poru.on('nodeConnect', (node) => {
			this.logger.debug(`Node ${node.name} connected successfully.`);
		});

		this.poru.on('nodeDisconnect', (node, reason) => {
			this.logger.warn(`Node ${node.name} disconnected. Reason: ${reason}`);
		});

		this.poru.on('nodeError', (node, error) => {
			this.logger.error(`Node ${node.name} encountered an error: ${error.message}`);
		});

		this.poru.on('nodeReconnect', (node) => {
			this.logger.info(`Node ${node.name} is reconnecting...`);
		});
	}

}

declare module 'discord.js' {
	interface Client {
		ownerIds: string[];
		commands: Collection<string, Command>;
		listener: Collection<string, Listener>;
		logger: Logger;
		prefixes: string[];
		restDebug: boolean;
		poru: Poru;
	}
}

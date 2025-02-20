import { CommandType } from '#lib/enums';
import { Command } from '#lib/structures';
import { ApplicationCommandOptionType } from 'discord.js';

export default new Command({
    type: CommandType.ChatInput,
    description: 'Pong!',
    ownerOnly: true,
    guildIds: [process.env.TEST_SERVER_ID], // ! Replace it with your test server id
    options: [
        {
            name: 'ping',
            description: 'pong?',
            required: true,
            type: ApplicationCommandOptionType.String,
        },
    ],
    async commandRun(interaction) {
        return await interaction.reply(`Pong? Pong!`)
    },
});

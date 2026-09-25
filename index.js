require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const express = require('express');

// سيرفر وهمي لإبقاء البوت شغال
const app = express();
app.get('/', (req, res) => res.send('Bot is Alive!'));
app.listen(process.env.PORT || 3000, () => console.log('Server is running...'));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

async function connectToVoice() {
    try {
        const guild = await client.guilds.fetch(process.env.GUILD_ID);
        const channel = await guild.channels.fetch(process.env.CHANNEL_ID);

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,
        });

        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.all([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
            } catch (error) {
                connection.destroy();
                connectToVoice();
            }
        });

        console.log('تم الدخول للروم الصوتي بنجاح!');
    } catch (error) {
        console.error('خطأ في الاتصال:', error);
    }
}

client.once('ready', () => {
    console.log(`البوت شغال باسم: ${client.user.tag}`);
    connectToVoice();
});

client.login(process.env.DISCORD_TOKEN);
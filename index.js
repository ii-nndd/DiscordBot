const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const express = require('express');
require('dotenv').config();

// سيرفر ويب بسيط عشان ريندر ما يطفي البوت
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot is running and alive in voice channels!');
});

app.listen(PORT, () => {
    console.log(`🌐 Web server is running on port ${PORT}`);
});

// إعداد البوت مع صلاحيات الفويس
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ]
});

client.once('ready', () => {
    console.log(`🤖 Logged in as ${client.user.tag}! Bot is ready for voice.`);
});

// أوامر الفويس البسيطة والمباشرة
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content === '!join') {
        if (message.member.voice.channel) {
            const channel = message.member.voice.channel;
            try {
                joinVoiceChannel({
                    channelId: channel.id,
                    guildId: channel.guild.id,
                    adapterCreator: channel.guild.voiceAdapterCreator,
                });
                message.reply(`أبشر، دخلت روم الصوت: ${channel.name}`);
            } catch (error) {
                console.error(error);
                message.reply('صار خطأ وانا أندخل الروم.');
            }
        } else {
            message.reply('يا بطل ادخل روم صوتي أولاً عشان أقدر أجيك!');
        }
    } else if (message.content === '!leave') {
        const connection = getVoiceConnection(message.guild.id);
        if (connection) {
            connection.destroy();
            message.reply('تم الخروج من الروم الصوتي.');
        } else {
            message.reply('أنا أصلاً مو بأي روم صوتي!');
        }
    }
});

// تسجيل الدخول بالتوكن حقك (المعرف في ريندر DISCORD_TOKEN أو TOKEN)
client.login(process.env.DISCORD_TOKEN || process.env.TOKEN);

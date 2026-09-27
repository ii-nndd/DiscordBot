const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const express = require('express');
require('dotenv').config();

// سيرفر الويب لريندر عشان يبقى البوت شغال
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Arthur Bot is running live and joined voice!');
});

app.listen(PORT, () => {
    console.log(`🌐 Web server is running on port ${PORT}`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates, // مهمة جداً عشان يقدر يدخل الفويس
    ]
});

// آيدي الروم الصوتي حقك
const TARGET_VOICE_CHANNEL_ID = '1552654973408514057';

client.once('ready', async () => {
    console.log(`🤖 Logged in as ${client.user.tag}!`);

    try {
        const channel = await client.channels.fetch(TARGET_VOICE_CHANNEL_ID);
        if (channel && channel.isVoiceBased()) {
            joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });
            console.log(`✅ تم الانضمام تلقائياً إلى روم الصوت: ${channel.name}`);
        } else {
            console.log("❌ لم يتم العثور على الروم الصوتي أو الآيدي غير صحيح!");
        }
    } catch (error) {
        console.error("خطأ أثناء محاولة الدخول التلقائي للفويس:", error);
    }
});

client.login(process.env.DISCORD_TOKEN || process.env.TOKEN);

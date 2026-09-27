const { Client, GatewayIntentBits, REST, Routes, Collection } = require('discord.js');
const { GoogleGenAI } = require('@google/genai');
const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// إعداد سيرفر الويب لريندر عشان يبقى البوت شغال
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Arthur & Joud Discord Bot is running live!');
});

app.listen(PORT, () => {
    console.log(`🌐 Web server is running on port ${PORT}`);
});

// إعداد عميل ديسكورد مع صلاحيات الرومات الصوتية والرسائل
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates, // مهمة جداً عشان الرومات الصوتية والبوتات اللي تدخل الروم
    ]
});

client.commands = new Collection();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// تحميل الأوامر
const aiCommandPath = path.join(__dirname, 'commands', 'ai.js');
if (fs.existsSync(aiCommandPath)) {
    const aiCommand = require(aiCommandPath);
    if ('data' in aiCommand && 'execute' in aiCommand) {
        client.commands.set(aiCommand.data.name, aiCommand);
    }
}

client.once('ready', async () => {
    console.log(`🤖 Logged in as ${client.user.tag}!`);

    const commands = [];
    client.commands.forEach(cmd => commands.push(cmd.data.toJSON()));

    const token = process.env.TOKEN;
    if (!token) {
        console.error("❌ الخطأ: توكن البوت غير موجود في Environment Variables في ريندر!");
        return;
    }

    const rest = new REST({ version: '10' }).setToken(token);

    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand())return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ حدث خطأ أثناء تنفيذ هذا الأمر.', ephemeral: true });
        }
    }
});

// تسجيل الدخول بالتوكن المحفوظ بأمان في ريندر
client.login(process.env.TOKEN);

const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');
const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers
    ]
});

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send(`
        <html style="background:#0f172a; color:#f8fafc; font-family:sans-serif; text-align:center; padding-top:50px;">
            <h1>🤖 Master Discord Bot Dashboard</h1>
            <p>Status: <span style="color:#22c55e;">Online & Operational 24/7</span></p>
            <p>Owned by Arthur</p>
        </html>
    `);
});

app.listen(PORT, () => console.log(`Dashboard active on port ${PORT}`));

const OWNER_ID = process.env.OWNER_ID || ""; 
const streaks = new Map();

const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('فحص سرعة استجابة البوت'),
    new SlashCommandBuilder().setName('profile').setDescription('عرض بطاقة بروفايلك والستريك الخاص بك'),
    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('مسح عدد معين من الرسائل (أدمن)')
        .addIntegerOption(option => option.setName('amount').setDescription('عدد الرسائل').setRequired(true)),
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('حظر عضو من السيرفر (أدمن)')
        .addUserOption(option => option.setName('target').setDescription('العضو المراد حظره').setRequired(true)),
    new SlashCommandBuilder().setName('flag-game').setDescription('بدء لعبة تخمين أعلام الدول'),
    new SlashCommandBuilder().setName('owner-panel').setDescription('لوحة التحكم الخاصة بمالك البوت فقط')
].map(cmd => cmd.toJSON());

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity('Managing Servers | /ping');

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('Successfully registered all Slash Commands globally!');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'ping') {
        return interaction.reply({ content: `🏓 Pong! WebSocket Latency: **${client.ws.ping}ms**`, ephemeral: true });
    }

    if (commandName === 'profile') {
        const userId = interaction.user.id;
        const userStreak = streaks.get(userId) || 0;
        const isOwner = userId === OWNER_ID;

        const profileEmbed = new EmbedBuilder()
            .setColor(isOwner ? '#FFD700' : '#0099ff')
            .setTitle(`👤 البروفايل الشخصي: ${interaction.user.username}`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                { name: '🔥 الستريك اليومي', value: `${userStreak} أيام`, inline: true },
                { name: '👑 الرتبة الخاصة', value: isOwner ? 'مالك البوت (Bot Owner VIP)' : 'عضو مجتمع', inline: true }
            )
            .setFooter({ text: 'Discord Master Bot' })
            .setTimestamp();

        return interaction.reply({ embeds: [profileEmbed] });
    }

    if (commandName === 'clear') {
        if (!interaction.member.permissions.has('ManageMessages')) {
            return interaction.reply({ content: '❌ ليس لديك صلاحية مسح الرسائل!', ephemeral: true });
        }
        const amount = interaction.options.getInteger('amount');
        await interaction.channel.bulkDelete(amount, true);
        return interaction.reply({ content: `🧹 تم مسح **${amount}** رسالة بنجاح.`, ephemeral: true });
    }

    if (commandName === 'ban') {
        if (!interaction.member.permissions.has('BanMembers')) {
            return interaction.reply({ content: '❌ ليس لديك صلاحية حظر الأعضاء!', ephemeral: true });
        }
        const target = interaction.options.getUser('target');
        await interaction.guild.members.ban(target);
        return interaction.reply({ content: `🔨 تم حظر العضو **${target.tag}** بنجاح من السيرفر.` });
    }

    if (commandName === 'flag-game') {
        const flags = [
            { country: 'السعودية', flag: '🇸🇦' },
            { country: 'مصر', flag: '🇪🇬' },
            { country: 'الإمارات', flag: '🇦🇪' },
            { country: 'الكويت', flag: '🇰🇼' }
        ];
        const randomFlag = flags[Math.floor(Math.random() * flags.length)];

        const gameEmbed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle('🎮 لعبة تخمين الأعلام')
            .setDescription(`ما اسم الدولة صاحب هذا العلم؟\n\n# ${randomFlag.flag}`)
            .setFooter({ text: 'لديك 15 ثانية للإجابة بكتابة اسم الدولة في الشات!' });

        await interaction.reply({ embeds: [gameEmbed] });

        const filter = m => m.content.includes(randomFlag.country);
        const collector = interaction.channel.createMessageCollector({ filter, time: 15000 });

        collector.on('collect', m => {
            m.reply(`🎉 إجابة صحيحة يا ${m.author}! زاد الستريك الخاص بك!`);
            const currentStreak = streaks.get(m.author.id) || 0;
            streaks.set(m.author.id, currentStreak + 1);
            collector.stop();
        });
    }

    if (commandName === 'owner-panel') {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ content: '🔒 هذا الأمر مخصص لمالك البوت فقط!', ephemeral: true });
        }
        return interaction.reply({ content: '👑 أهلاً بك يا مالك البوت! جميع أنظمة التحكم بالسيرفر والذكاء الاصطناعي جاهزة لأوامرك.', ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);

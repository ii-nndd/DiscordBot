const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const express = require('express');
const dotenv = require('dotenv');
const play = require('play-dl');

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

// إعداد خادم الويب للداشبورد وإبقاء البوت مستيقظاً
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send(`
        <html style="background:#0f172a; color:#f8fafc; font-family:sans-serif; text-align:center; padding-top:50px;">
            <h1>🤖 Discord Bot Master Dashboard</h1>
            <p>Status: <span style="color:#22c55e;">Online & Operational 24/7</span></p>
            <p>Developed for Arthur & Managed via AI Coordination</p>
        </html>
    `);
});

app.listen(PORT, () => console.log(`Dashboard listening on port ${PORT}`));

// صلاحيات مالك البوت الخاص (صلاحيات VIP)
const OWNER_ID = process.env.OWNER_ID || ""; 

// بيانات الألعاب والستريك
const streaks = new Map();

// تسجيل أوامر الـ Slash Commands
const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('فحص سرعة استجابة البوت'),
    new SlashCommandBuilder().setName('profile').setDescription('عرض بطاقة بروفايلك والستريك الخاص بك'),
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('تشغيل أغنية في الروم الصوتي')
        .addStringOption(option => option.setName('query').setDescription('اسم الأغنية أو رابط يوتيوب').setRequired(true)),
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

    // تسجيل الأوامر عالمياً لكل السيرفرات
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

// التعامل مع أوامر Slash Commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    // 1. أمر فحص الاستجابة
    if (commandName === 'ping') {
        return interaction.reply({ content: `🏓 Pong! WebSocket Latency: **${client.ws.ping}ms**`, ephemeral: true });
    }

    // 2. بطاقة البروفايل والستريك
    if (commandName === 'profile') {
        const userId = interaction.user.id;
        const userStreak = streaks.get(userId) || 0;
        const isOwner = userId === OWNER_ID;

        const profileEmbed = new EmbedBuilder()
            .setColor(isOwner ? '#gold' : '#0099ff')
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

    // 3. تشغيل الأغاني والصوتيات
    if (commandName === 'play') {
        const query = interaction.options.getString('query');
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({ content: '❌ يجب أن تكون متواجدًا في روم صوتي أولاً!', ephemeral: true });
        }

        await interaction.deferReply();

        try {
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });

            const ytInfo = await play.search(query, { limit: 1 });
            if (!ytInfo || ytInfo.length === 0) {
                return interaction.editReply('❌ لم يتم العثور على نتائج للبحث.');
            }

            const stream = await play.stream(ytInfo[0].url);
            const resource = createAudioResource(stream.stream, { inputType: stream.type });
            const player = createAudioPlayer();

            player.play(resource);
            connection.subscribe(player);

            return interaction.editReply(`🎶 يتم الآن تشغيل: **${ytInfo[0].title}** في روم ${voiceChannel.name}`);
        } catch (err) {
            console.error(err);
            return interaction.editReply('⚠️ حدث خطأ أثناء محاولة تشغيل الصوت.');
        }
    }

    // 4. مسح الرسائل (إدارة)
    if (commandName === 'clear') {
        if (!interaction.member.permissions.has('ManageMessages')) {
            return interaction.reply({ content: '❌ ليس لديك صلاحية مسح الرسائل!', ephemeral: true });
        }
        const amount = interaction.options.getInteger('amount');
        await interaction.channel.bulkDelete(amount, true);
        return interaction.reply({ content: `🧹 تم مسح **${amount}** رسالة بنجاح.`, ephemeral: true });
    }

    // 5. حظر عضو (إدارة)
    if (commandName === 'ban') {
        if (!interaction.member.permissions.has('BanMembers')) {
            return interaction.reply({ content: '❌ ليس لديك صلاحية حظر الأعضاء!', ephemeral: true });
        }
        const target = interaction.options.getUser('target');
        await interaction.guild.members.ban(target);
        return interaction.reply({ content: `🔨 تم حظر العضو **${target.tag}** بنجاح من السيرفر.` });
    }

    // 6. لعبة الأعلام
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

    // 7. لوحة المالك الخاصة
    if (commandName === 'owner-panel') {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ content: '🔒 هذا الأمر مخصص لمالك البوت فقط!', ephemeral: true });
        }
        return interaction.reply({ content: '👑 أهلاً بك يا مالك البوت! جميع أنظمة التحكم بالسيرفر والذكاء الاصطناعي جاهزة لأوامرك.', ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);

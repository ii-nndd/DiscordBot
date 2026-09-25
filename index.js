const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, SlashCommandBuilder } = require('discord.js');
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
            <h1>🤖 ND • ARTHUR BOT - Master Dashboard</h1>
            <p>Status: <span style="color:#22c55e;">Online & Operational 24/7</span></p>
            <p>Chill & Games Suite: Active</p>
            <p>Owned by Arthur</p>
        </html>
    `);
});

app.listen(PORT, () => console.log(`Dashboard active on port ${PORT}`));

const OWNER_ID = process.env.OWNER_ID || ""; 
const VOICE_CHANNEL_ID = process.env.CHANNEL_ID || "";

// تسجيل الأوامر الشاملة (مع الأوامر الجديدة الخاصة بالجو الرايق)
const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('فحص سرعة استجابة البوت'),
    new SlashCommandBuilder().setName('profile').setDescription('عرض بطاقة بروفايلك والرتبة الخاصة'),
    new SlashCommandBuilder().setName('help').setDescription('عرض قائمة الأوامر والمساعدة'),
    // ألعاب الونسة والسوالف
    new SlashCommandBuilder().setName('كت').setDescription('سؤال كت تويت عشوائي وممتع'),
    new SlashCommandBuilder().setName('صراحة').setDescription('سؤال صراحة وجريء لفتح السوالف'),
    new SlashCommandBuilder().setName('لطيف').setDescription('كلمة أو عبارة لطيفة تروق المزاج'),
    new SlashCommandBuilder().setName('لغز').setDescription('حل اللغز واختبر ذكاءك'),
    new SlashCommandBuilder().setName('رياضيات').setDescription('تحدي العمليات الحسابية السريعة'),
    new SlashCommandBuilder().setName('عقاب').setDescription('عقاب عشوائي خفيف'),
    new SlashCommandBuilder().setName('نکته').setDescription('اضحك مع نكتة جديدة'),
    // أوامر الإدارة
    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('مسح عدد معين من الرسائل (أدمن)')
        .addIntegerOption(option => option.setName('amount').setDescription('عدد الرسائل').setRequired(true)),
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('حظر عضو من السيرفر (أدمن)')
        .addUserOption(option => option.setName('target').setDescription('العضو المراد حظره').setRequired(true)),
    new SlashCommandBuilder().setName('owner-panel').setDescription('لوحة التحكم الخاصة بمالك البوت فقط')
].map(cmd => cmd.toJSON());

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity('☕ Chill & Games | /help');

    if (VOICE_CHANNEL_ID) {
        const channel = await client.channels.fetch(VOICE_CHANNEL_ID).catch(() => null);
        if (channel && channel.isVoiceBased()) {
            try {
                const { joinVoiceChannel } = require('@discordjs/voice');
                joinVoiceChannel({
                    channelId: channel.id,
                    guildId: channel.guild.id,
                    adapterCreator: channel.guild.voiceAdapterCreator,
                    selfDeaf: false,
                    selfMute: true
                });
                console.log(`Successfully joined 24/7 voice channel: ${channel.name}`);
            } catch (error) {
                console.error('Failed to join voice channel:', error);
            }
        }
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Successfully registered all Master Bot commands globally!');
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
        const isOwner = userId === OWNER_ID;

        const profileEmbed = new EmbedBuilder()
            .setColor(isOwner ? '#FFD700' : '#0099ff')
            .setTitle(`👤 البروفايل الشخصي: ${interaction.user.username}`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                { name: '🔥 الستريك اليومي', value: `0 أيام`, inline: true },
                { name: '👑 الرتبة الخاصة', value: isOwner ? 'مالك البوت (Bot Owner VIP)' : 'عضو مميز', inline: true }
            )
            .setFooter({ text: 'ND • ARTHUR BOT' })
            .setTimestamp();

        return interaction.reply({ embeds: [profileEmbed] });
    }

    // أمر المساعدة (Help) المحدث
    if (commandName === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setColor('#7c3aed')
            .setTitle('📜 قائمة أوامر ND • ARTHUR BOT')
            .setDescription('أوامر السوالف والونسة المتاحة في سيرفركم الرايق:')
            .addFields(
                { name: '☕ ألعاب وسوالف ونسة', value: '`/كت` - سؤال كت تويت\n`/صراحة` - أسئلة صراحة وجريئة\n`/لطيف` - عبارات تروق المزاج\n`/لغز` - حل الألغاز\n`/رياضيات` - تحدي السريعة\n`/عقاب` - عقاب خفيف\n`/نکته` - نكتة سريعة', inline: false },
                { name: '👤 البروفايل', value: '`/profile` - عرض بطاقتك', inline: false },
                { name: '🛠️ الإدارة', value: '`/clear` - مسح الرسائل\n`/ban` - حظر\n`/owner-panel` - لوحة المالك', inline: false }
            )
            .setFooter({ text: 'ND • ARTHUR BOT - Chill Vibe' })
            .setTimestamp();

        return interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    }

    // الألعاب والونسة
    if (commandName === 'كت') {
        const cutTweets = [
            'لو عندك قدرة تمسح موقف محرج من ذاكرة الشخص الثاني، وش بيكون؟',
            'أكثر صفه تعجبك في الشخص اللي جالس معك الحين؟',
            'وش أكتر شيء تفضل تسوونه مع بعض بالسيرفر؟',
            'لو سافرتم مع بعض لسفرة طويلة، وش أول وجهة تختارونها؟'
        ];
        const randomCut = cutTweets[Math.floor(Math.random() * cutTweets.length)];
        const embed = new EmbedBuilder().setColor('#ff7675').setTitle('🎯 كت تويت رايق').setDescription(randomCut);
        return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'صراحة') {
        const truths = [
            'صراحة: متى آخر مرة ضحكت من قلبك بسبب شخص معك بالسيرفر؟',
            'صراحة: هل تخبي عنه شيء دايم ولا صريح بكل أمورك؟',
            'صراحة: وش أكثر كلمة أو جملة يقولها وتترك أثر حلو في خاطرك؟',
            'صراحة: لو طلب منك تعزمه على مكان فخم، وين تأخذه؟'
        ];
        const randomTruth = truths[Math.floor(Math.random() * truths.length)];
        const embed = new EmbedBuilder().setColor('#e84393').setTitle('💬 صراحة وشفافية').setDescription(randomTruth);
        return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'لطيف') {
        const sweetWords = [
            '✨ "وجود الأشخاص اللطيفين بحياتنا يخلي الأيام أبسط وأجمل بكثير."',
            '☕ "روقان القعدة مع ناس تفهمك يسوى الدنيا وما فيها!"',
            '🌟 "دايماً خلّي ابتسامتك هي عنوان يومك."',
            '💫 "شكراً لأنك تخلي هالسيرفر مكان دافئ ومريح للجلوس فيه."'
        ];
        const randomSweet = sweetWords[Math.floor(Math.random() * sweetWords.length)];
        const embed = new EmbedBuilder().setColor('#00b894').setTitle('🍃 لقطة لطيفة').setDescription(randomSweet);
        return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'لغز') {
        const puzzles = [
            { q: 'ما هو الشيء الذي يرفع شيئاً ثقيلاً ومع ذلك لا يقدر على مسمار؟', a: 'البحر' },
            { q: 'حامل ومحمول نصفه ناشف ونصفه مبلول فمن يكون؟', a: 'السفينة' },
            { q: 'ما هو الشيء الذي يسير أمامك ولا تراه؟', a: 'الهواء' }
        ];
        const p = puzzles[Math.floor(Math.random() * puzzles.length)];
        const embed = new EmbedBuilder().setColor('#fdcb6e').setTitle('🧩 لعبة الألغاز').setDescription(p.q);
        return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'رياضيات') {
        const n1 = Math.floor(Math.random() * 12) + 1;
        const n2 = Math.floor(Math.random() * 12) + 1;
        const embed = new EmbedBuilder().setColor('#0984e3').setTitle('🧮 تحدي الرياضيات').setDescription(`كم الناتج السريع: **${n1} × ${n2}**؟`);
        return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'عقاب') {
        const punishments = [
            'عقابك: تعترف بشيء جميل تحبه في الطرف الثاني!',
            'عقابك: تعبر عن شعورك بجملة طريفة ومضحكة.',
            'عقابك: ممنوع تتكلم فصوتك 5 دقائق وتكتب بالشات بس!'
        ];
        const p = punishments[Math.floor(Math.random() * punishments.length)];
        const embed = new EmbedBuilder().setColor('#d63031').setTitle('🎲 عقاب خفيف').setDescription(p);
        return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'نکته') {
        const jokes = [
            'واحد يزرع مسمار بالارض ليش؟ يبي يطلع شجرة سياكل!',
            'محشش سألوه: وش رايك في الزواج المبكر؟ قال: يعني الساعة كم؟',
            'واحد غبي ضاع تلفونه، راح يبلغ الشرطة قالوا له الشرطة بنطلعه من تحت الأرض، قال: لا، أنا ضيعته فوق السطح!'
        ];
        const j = jokes[Math.floor(Math.random() * jokes.length)];
        const embed = new EmbedBuilder().setColor('#e17055').setTitle('😂 نكتة سريعة').setDescription(j);
        return interaction.reply({ embeds: [embed] });
    }

    // الإدارة
    if (commandName === 'clear') {
        if (!interaction.member.permissions.has('ManageMessages')) return interaction.reply({ content: '❌ ليس لديك صلاحية لإدارة الرسائل!', ephemeral: true });
        const amount = interaction.options.getInteger('amount');
        await interaction.channel.bulkDelete(amount, true).catch(() => {});
        return interaction.reply({ content: `🧹 تم مسح **${amount}** رسالة بنجاح.`, ephemeral: true });
    }

    if (commandName === 'ban') {
        if (!interaction.member.permissions.has('BanMembers')) return interaction.reply({ content: '❌ ليس لديك صلاحية لحظر الأعضاء!', ephemeral: true });
        const target = interaction.options.getUser('target');
        await interaction.guild.members.ban(target).catch(() => {});
        return interaction.reply({ content: `🔨 تم حظر العضو بنجاح من السيرفر.` });
    }

    if (commandName === 'owner-panel') {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: '🔒 هذا الأمر لمالك البوت فقط!', ephemeral: true });
        return interaction.reply({ content: '👑 أهلاً بك يا أرثر في لوحة تحكم المالك الخاصة!', ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);

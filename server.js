const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ==================== 初始化数据库 ====================
const db = new sqlite3.Database('./runners.db', (err) => {
    if (err) console.error('❌ 数据库打开失败:', err.message);
    else { console.log('✅ 数据库已连接（runners.db）'); initDatabase(); }
});

function initDatabase() {
    db.run(`
        CREATE TABLE IF NOT EXISTS runners (
            id TEXT PRIMARY KEY,
            password_hash TEXT NOT NULL,
            name TEXT, codename TEXT, gender TEXT, age TEXT, dob TEXT,
            height TEXT, weight TEXT, run50m TEXT, run1000m TEXT, jump TEXT,
            pullup TEXT, sitreach TEXT, lung TEXT, recent_score TEXT,
            start_leg TEXT, role TEXT, members TEXT
        )
    `, (err) => {
        if (err) console.error('❌ 建表失败:', err.message);
        else { console.log('✅ runners 表已就绪'); seedInitialData(); }
    });
}

// ==================== 初始化种子数据 ====================
function seedInitialData() {
    const users = [
        { id: '123sZ01', password: 'cxd123456_251620130216tzqwch', name: '储旭东', codename: '墨', gender: '男', age: '13', dob: '2013.2.16', height: '183 cm', weight: '57.5 kg', run50m: "7'52''", run1000m: '3min25s', jump: '210 cm', pullup: '6 个', sitreach: '17.9 cm', lung: '5252 ml', recentScore: '90.6 分', startLeg: '右、右', role: '队长', members: '队员:汤子麒（123sY01），王宸赫（123sY02），胡钟灿（123sY03）' },
        { id: '123sY01', password: '1234567890', name: '汤子麒', codename: 'T', gender: '男', age: '13岁8个月', dob: '2013.2.4', height: '178 cm', weight: '61 kg', run50m: "7'40''", run1000m: '3min49s', jump: '240 cm', pullup: '5 个', sitreach: '20 cm', lung: '未知', recentScore: '85 分', startLeg: '右、右', role: '队员', members: '队长:储旭东（123sZ01），队员:王宸赫（123sY02），胡钟灿（123sY03）' },
        { id: '123sY02', password: '1234567890', name: '王宸赫', codename: '赫', gender: '男', age: '13岁2个月', dob: '2013.8.8', height: '173 cm', weight: '46.8 kg', run50m: "7'90''", run1000m: '3min35s', jump: '225 cm', pullup: '3 个', sitreach: '14.0 cm', lung: '未知', recentScore: '78 分', startLeg: '左、右', role: '队员', members: '队长:储旭东（123sZ01），队员:汤子麒（123sY01），胡钟灿（123sY03）' },
        { id: '123sY03', password: '1234567890', name: '胡钟灿', codename: '未知', gender: '男', age: '13岁11个月', dob: '2012.11.9', height: '161 cm', weight: '49 kg', run50m: "8'80''", run1000m: '4min40s', jump: '200 cm', pullup: '1 个', sitreach: '7.5 cm', lung: '3100 ml', recentScore: '未知', startLeg: '未知', role: '队员', members: '队长:储旭东（123sZ01），队员:汤子麒（123sY01），王宸赫（123sY02）' }
    ];

    users.forEach((u) => {
        db.get('SELECT id FROM runners WHERE id = ?', [u.id], (err, row) => {
            if (err) return console.error(err.message);
            if (!row) {
                const hash = bcrypt.hashSync(u.password, 10);
                db.run(`INSERT INTO runners (id, password_hash, name, codename, gender, age, dob, height, weight, run50m, run1000m, jump, pullup, sitreach, lung, recent_score, start_leg, role, members) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [u.id, hash, u.name, u.codename, u.gender, u.age, u.dob, u.height, u.weight, u.run50m, u.run1000m, u.jump, u.pullup, u.sitreach, u.lung, u.recentScore, u.startLeg, u.role, u.members],
                (err) => { if (err) console.error('插入失败:', err.message); else console.log(`✅ 已初始化跑者: ${u.name}（${u.id}）`); });
            }
        });
    });
}

// ==================== API 接口 ====================
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: '请输入用户名和密码' });
    db.get('SELECT * FROM runners WHERE id = ?', [username], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: '服务器错误' });
        if (!row) return res.status(401).json({ success: false, message: '用户名或密码错误' });
        if (!bcrypt.compareSync(password, row.password_hash)) return res.status(401).json({ success: false, message: '用户名或密码错误' });
        const info = { id: row.id, name: row.name, codename: row.codename, gender: row.gender, age: row.age, dob: row.dob, height: row.height, weight: row.weight, run50m: row.run50m, run1000m: row.run1000m, jump: row.jump, pullup: row.pullup, sitreach: row.sitreach, lung: row.lung, recentScore: row.recent_score, startleg: row.start_leg, role: row.role, members: row.members };
        res.json({ success: true, info });
    });
});

app.get('/api/runners', (req, res) => {
    db.all('SELECT id, name, codename, role FROM runners', [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: '服务器错误' });
        res.json({ success: true, runners: rows });
    });
});

app.post('/api/forgot-password', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ success: false, message: '请输入用户名' });
    db.get('SELECT id FROM runners WHERE id = ?', [username], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: '服务器错误' });
        if (!row) return res.status(404).json({ success: false, message: '用户名不存在' });
        res.json({ success: true, message: '密码提示已发送，请查看你的注册邮箱' });
    });
});

app.listen(PORT, () => {
    console.log(`\n🚀 服务器已启动: http://localhost:${PORT}`);
    console.log(`📋 测试账号: 123sZ01 / cxd123456_251620130216tzqwch\n`);
});

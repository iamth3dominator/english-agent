// generate-content.js
// Nguồn từ vựng: Oxford 3000/5000 word list (bundled trong repo)
// Claude chỉ làm: phiên âm, nghĩa tiếng Việt, ví dụ, câu hỏi ngữ pháp, đọc hiểu

const fs   = require('fs');
const https = require('https');

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error('❌ ANTHROPIC_API_KEY chưa set'); process.exit(1); }

// Đọc word list (54,000+ từ có CEFR level từ Oxford 3000 + wordfreq corpus)
const wordList = JSON.parse(fs.readFileSync('data/oxford-words.json', 'utf8'));

// Đọc version cũ để tránh lặp từ
let prevContent = null;
try { prevContent = JSON.parse(fs.readFileSync('data/content.json', 'utf8')); } catch(e) {}
const usedWords = new Set(prevContent
  ? [...(prevContent.vocabulary?.beginner||[]), ...(prevContent.vocabulary?.intermediate||[]), ...(prevContent.vocabulary?.advanced||[])]
      .map(w => w.word)
  : []);

// Chọn từ từ word list theo CEFR
// Ưu tiên: Oxford 3000 words (*) trước, sau đó chọn ngẫu nhiên từ pool
function pickWords(cefrLevels, count) {
  let pool = [];
  cefrLevels.forEach(lv => {
    (wordList[lv] || []).forEach(entry => {
      const word = entry.startsWith('*') ? entry.slice(1) : entry;
      const isOxford = entry.startsWith('*');
      if (!usedWords.has(word)) {
        pool.push({ word, cefr: lv, priority: isOxford ? 1 : 0 });
      }
    });
  });
  // Oxford words ưu tiên cao hơn, sau đó random
  const oxford = pool.filter(w => w.priority === 1).sort(() => Math.random() - 0.5);
  const others = pool.filter(w => w.priority === 0).sort(() => Math.random() - 0.5);
  return [...oxford, ...others].slice(0, count);
}

function callClaude(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }]
    });
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const p = JSON.parse(data);
          if (p.error) reject(new Error(p.error.message));
          else resolve(p.content[0].text);
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

async function enrichVocabulary(words, level) {
  console.log(`  Enriching ${words.length} ${level} words from Oxford list...`);
  const wordList = words.map(w => w.word).join(', ');

  const text = await callClaude(`Bạn nhận được danh sách từ tiếng Anh từ Oxford 3000/5000 word list.
Nhiệm vụ: bổ sung thông tin cho mỗi từ để dạy người Việt học tiếng Anh.

Danh sách từ: ${wordList}

Trả về JSON array, KHÔNG có text thừa:
[
  {
    "word": "từ gốc",
    "phonetic": "/phiên âm IPA chuẩn/",
    "type": "noun/verb/adjective/adverb",
    "meaning": "nghĩa tiếng Việt ngắn gọn, chính xác",
    "example": "1 câu ví dụ tiếng Anh tự nhiên, thực tế",
    "example_vi": "dịch nghĩa câu ví dụ sang tiếng Việt",
    "topic": "emotions|work|travel|health|technology|environment|education|food|relationships|culture|academic",
    "cefr": "${level === 'beginner' ? 'A1 hoặc A2' : level === 'intermediate' ? 'B1 hoặc B2' : 'C1 hoặc C2'}",
    "tip": "mẹo nhớ từ hoặc lưu ý cách dùng ngắn gọn bằng tiếng Việt"
  }
]

Yêu cầu: phiên âm IPA chuẩn, nghĩa chính xác, ví dụ tự nhiên không học thuộc, tip hữu ích.`);

  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

async function generateGrammar() {
  console.log('  Generating grammar questions...');
  const text = await callClaude(`Tạo câu hỏi ngữ pháp tiếng Anh chuẩn cho người Việt theo phong cách IELTS/Cambridge.

Trả về JSON, KHÔNG text thừa:
{
  "beginner": [15 câu A1-A2],
  "intermediate": [15 câu B1-B2],
  "advanced": [15 câu C1-C2]
}

Mỗi câu:
{
  "id": "g_b_001",
  "question": "câu hỏi rõ ràng, có ___ hoặc chọn cấu trúc đúng",
  "options": ["A","B","C","D"],
  "answer": 0,
  "explanation": "giải thích ngắn gọn bằng tiếng Việt tại sao đáp án đúng",
  "topic": "tên_điểm_ngữ_pháp",
  "cefr": "A1"
}

Phân bổ:
- beginner: present simple/continuous, past simple, articles (a/an/the), prepositions, pronouns, there is/are
- intermediate: present perfect, past perfect, conditionals 1&2, passive voice, modal verbs, gerund vs infinitive, reported speech
- advanced: mixed conditionals, subjunctive, inversion, ellipsis, cleft sentences, discourse markers, nominalization

Câu hỏi phải thực tế, đa dạng, không lặp chủ điểm trong cùng level.`);

  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

async function generateReading() {
  console.log('  Generating reading comprehension...');
  const month = new Date().toLocaleString('en', { month: 'long', year: 'numeric' });
  const text = await callClaude(`Tạo 3 bài đọc hiểu tiếng Anh cho người Việt — 1 dễ (A2), 1 trung bình (B1-B2), 1 khó (C1).
Tháng: ${month}. Chủ đề đa dạng, thực tế, không trùng nhau.

Trả về JSON array, KHÔNG text thừa:
[
  {
    "level": "beginner",
    "cefr": "A2",
    "title": "tiêu đề ngắn hấp dẫn",
    "topic": "chủ đề",
    "passage": "đoạn văn 70-90 từ, ngôn ngữ đơn giản, tự nhiên",
    "questions": [
      {
        "question": "câu hỏi về nội dung đoạn văn",
        "options": ["A","B","C","D"],
        "answer": 0,
        "explanation": "giải thích bằng tiếng Việt, chỉ rõ dòng nào trong bài"
      }
    ]
  }
]

Mỗi bài có 2 câu hỏi. Câu hỏi kiểm tra: main idea, specific detail, inference, vocabulary in context.
Đoạn văn phải tự nhiên như báo/blog thật, không có dấu hiệu "học thuật giả tạo".`);

  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

async function main() {
  const month = new Date().toISOString().slice(0, 7);
  console.log(`\n🚀 Generating content for ${month}...`);
  console.log(`📖 Source: Oxford 3000/5000 word list (bundled)\n`);

  try {
    // Chọn từ từ Oxford list
    const beginnerWords    = pickWords(['A1', 'A2'], 20);
    const intermediateWords = pickWords(['B1', 'B2'], 20);
    const advancedWords    = pickWords(['C1', 'C2'], 20);

    console.log(`📚 Vocabulary:`);
    const [bEnriched, iEnriched, aEnriched, grammar, reading] = await Promise.all([
      enrichVocabulary(beginnerWords,    'beginner'),
      enrichVocabulary(intermediateWords, 'intermediate'),
      enrichVocabulary(advancedWords,    'advanced'),
      generateGrammar(),
      generateReading()
    ]);

    const vocabulary = {
      beginner:     bEnriched,
      intermediate: iEnriched,
      advanced:     aEnriched
    };

    const totalWords   = bEnriched.length + iEnriched.length + aEnriched.length;
    const totalGrammar = (grammar.beginner?.length||0) + (grammar.intermediate?.length||0) + (grammar.advanced?.length||0);

    const content = {
      version:     month,
      generatedAt: new Date().toISOString(),
      nextUpdate:  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      source: {
        vocabulary: 'Oxford 3000/5000 word list — bundled in repo',
        grammar:    'Claude AI — Cambridge/IELTS style',
        reading:    'Claude AI — authentic passage style'
      },
      stats: { words: totalWords, grammarQ: totalGrammar, readingPassages: reading.length },
      vocabulary,
      grammar,
      reading
    };

    if (!fs.existsSync('data')) fs.mkdirSync('data');
    fs.writeFileSync('data/content.json', JSON.stringify(content, null, 2), 'utf8');

    console.log(`\n✅ Done!`);
    console.log(`   📚 Vocabulary : ${totalWords} từ (nguồn Oxford 3000/5000)`);
    console.log(`   ✏️  Grammar    : ${totalGrammar} câu hỏi`);
    console.log(`   📖 Reading    : ${reading.length} bài đọc hiểu`);
    console.log(`   📅 Version    : ${month}`);
    console.log(`   🔄 Next update: ${content.nextUpdate}`);
  } catch(err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

main();

#!/usr/bin/env python3
"""
BERT 语义相似度微服务
──────────────────────────────────────────────────────────────────
使用 sentence-transformers 提供多语言文本嵌入及余弦相似度计算，
供 Node.js 后端的"语义层"查重调用。

启动方式：
  pip install -r requirements.txt
  python bert_service.py          # 默认端口 5001
  BERT_PORT=5001 python bert_service.py

API 端点：
  GET  /health                     健康检查
  POST /batch-similarity           批量计算相似度（推荐）
  POST /embed                      获取单条文本嵌入
"""

import os
import hashlib
import logging
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# ── 模型加载 ──────────────────────────────────────────────────────
# paraphrase-multilingual-MiniLM-L12-v2：
#   体积小（~120MB），支持中英文，速度快，适合生产部署
MODEL_NAME = os.environ.get(
    'BERT_MODEL',
    'paraphrase-multilingual-MiniLM-L12-v2'
)

model = None

def load_model():
    global model
    if model is None:
        logger.info(f"正在加载模型: {MODEL_NAME}")
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(MODEL_NAME)
        logger.info("模型加载完毕")
    return model


# ── 嵌入缓存（基于 MD5 Key，内存缓存，重启后清空）────────────────
_embedding_cache: dict = {}

def get_embedding(text: str) -> np.ndarray:
    """计算文本嵌入，带内存缓存。"""
    key = hashlib.md5(text.encode('utf-8', errors='replace')).hexdigest()
    if key not in _embedding_cache:
        m = load_model()
        _embedding_cache[key] = m.encode(text, convert_to_numpy=True)
    return _embedding_cache[key]


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """手动计算余弦相似度（避免引入额外依赖）。"""
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


# ── 路由 ──────────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'model': MODEL_NAME,
        'cached_embeddings': len(_embedding_cache)
    })


@app.route('/embed', methods=['POST'])
def embed():
    """返回单条文本的嵌入向量。"""
    data = request.get_json(silent=True) or {}
    text = (data.get('text') or '').strip()
    if not text:
        return jsonify({'error': 'text 字段不能为空'}), 400

    emb = get_embedding(text[:3000])  # 限制长度
    return jsonify({'embedding': emb.tolist(), 'dim': len(emb)})


@app.route('/batch-similarity', methods=['POST'])
def batch_similarity():
    """
    批量计算 query 与 documents 列表的余弦相似度（高效向量化）。

    请求体：
    {
      "query": "查询文本",
      "documents": [{"id": "...", "text": "..."}, ...],
      "topK": 10,
      "threshold": 0.5
    }

    响应体：
    {
      "results": [
        {"id": "...", "score": 0.82, "similarityPercent": 82},
        ...
      ],
      "bertAvailable": true
    }
    """
    data = request.get_json(silent=True) or {}
    query = (data.get('query') or '').strip()
    documents = data.get('documents') or []
    top_k = int(data.get('topK', 10))
    threshold = float(data.get('threshold', 0.5))

    if not query or not documents:
        return jsonify({'results': [], 'bertAvailable': True})

    try:
        m = load_model()

        # 批量编码（比逐条快 5-10×）
        texts = [d.get('text', '')[:1000] for d in documents]
        query_emb = m.encode(query[:2000], convert_to_numpy=True)
        doc_embs  = m.encode(texts, convert_to_numpy=True, batch_size=32)

        results = []
        for i, (doc, emb) in enumerate(zip(documents, doc_embs)):
            score = cosine_similarity(query_emb, emb)
            if score >= threshold:
                results.append({
                    'id':               doc.get('id', str(i)),
                    'score':            round(score, 4),
                    'similarityPercent': min(100, round(score * 100))
                })

        results.sort(key=lambda x: x['score'], reverse=True)
        return jsonify({
            'results':       results[:top_k],
            'bertAvailable': True
        })

    except Exception as e:
        logger.exception("batch-similarity 处理失败")
        return jsonify({'error': str(e), 'bertAvailable': False}), 500


# ── 入口 ──────────────────────────────────────────────────────────
if __name__ == '__main__':
    port = int(os.environ.get('BERT_PORT', 5001))
    logger.info(f"BERT 服务启动，端口 {port}")
    # 预热：提前加载模型
    load_model()
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)

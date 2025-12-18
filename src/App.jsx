import React, { useMemo, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { supabase } from "./supabaseClient";

const LS = "badminton_v1";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function load() {
  try {
    const raw = localStorage.getItem(LS);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function save(v) {
  localStorage.setItem(LS, JSON.stringify(v));
}

function getMeId() {
  const k = "badminton_me_id";
  let v = localStorage.getItem(k);
  if (!v) {
    v = uid();
    localStorage.setItem(k, v);
  }
  return v;
}

function Shell({ children }) {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ fontWeight: 800 }}>🏸 羽毛球接龙</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <Link to="/">接龙</Link>
          <Link to="/billing">计费</Link>
        </div>
      </div>
      {children}
      <div style={{ marginTop: 18, fontSize: 12, opacity: 0.65 }}>
        当前是本地演示版（昵称/数据存本机）。下一步我们会接 Supabase，实现“只输入一次昵称且跨设备也识别同一人”。
      </div>
    </div>
  );
}

function Nickname({ state, setState }) {
  const meId = useMemo(() => getMeId(), []);
  const me = state.profiles[meId];
  const [name, setName] = useState(me?.nickname || "");

  if (me?.nickname) return null;

  const used = new Set(Object.values(state.profiles).map((p) => p.nickname));
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, marginBottom: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>第一次进入：请设置昵称（只需一次）</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：小王 / 阿杰"
          style={{ flex: 1, padding: 10, border: "1px solid #ccc", borderRadius: 10 }}
        />
        <button
          style={{ padding: "10px 14px", borderRadius: 10 }}
          onClick={() => {
            const n = name.trim();
            if (!n) return alert("请输入昵称");
            if (used.has(n)) return alert("昵称已被使用，请换一个");
            const next = { ...state, profiles: { ...state.profiles, [meId]: { nickname: n } } };
            setState(next);
            save(next);
          }}
        >
          保存
        </button>
      </div>
    </div>
  );
}

function Home({ state, setState }) {
  const meId = useMemo(() => getMeId(), []);
  const meName = state.profiles[meId]?.nickname || "";
  const locked = state.session.status !== "draft";

  const my = state.signups.find((s) => s.userId === meId);

  const confirmed = state.signups.filter((s) => s.status === "confirmed");
  const tentative = state.signups.filter((s) => s.status === "tentative");

  function upsert(status) {
    if (!meName) return alert("请先设置昵称");
    if (locked) return alert("活动已开始，接龙锁定");
    const existing = state.signups.find((s) => s.userId === meId);
    const item = {
      id: existing?.id || uid(),
      userId: meId,
      status,
      participation: existing?.participation || "full",
    };
    const next = {
      ...state,
      signups: existing ? state.signups.map((s) => (s.userId === meId ? item : s)) : [...state.signups, item],
    };
    setState(next);
    save(next);
  }

  function cancel() {
    if (!meName) return alert("请先设置昵称");
    if (locked) return alert("活动已开始，接龙锁定");
    const next = { ...state, signups: state.signups.filter((s) => s.userId !== meId) };
    setState(next);
    save(next);
  }

  function setPart(p) {
    if (!my) return alert("请先加入接龙");
    if (locked) return alert("活动已开始，接龙锁定");
    const next = { ...state, signups: state.signups.map((s) => (s.userId === meId ? { ...s, participation: p } : s)) };
    setState(next);
    save(next);
  }

  return (
    <div>
      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, marginBottom: 12 }}>
        <div style={{ fontWeight: 800 }}>{state.session.title}</div>
        <div style={{ opacity: 0.85 }}>时间：{state.session.time}</div>
        <div style={{ opacity: 0.85 }}>地点：{state.session.location}</div>
        <div style={{ opacity: 0.75 }}>状态：{state.session.status === "draft" ? "接龙中" : "已开始/锁定"}</div>
      </div>

      <Nickname state={state} setState={setState} />

      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <button style={{ padding: "10px 12px", borderRadius: 10 }} onClick={() => upsert("confirmed")} disabled={!meName}>
          我确定来
        </button>
        <button style={{ padding: "10px 12px", borderRadius: 10 }} onClick={() => upsert("tentative")} disabled={!meName}>
          我待定
        </button>
        <button style={{ padding: "10px 12px", borderRadius: 10 }} onClick={cancel} disabled={!meName}>
          取消接龙
        </button>
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 12 }}>
        <div style={{ opacity: 0.8 }}>我的时长：</div>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="radio" name="p" checked={my?.participation === "full"} onChange={() => setPart("full")} disabled={!my} />
          全程
        </label>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="radio" name="p" checked={my?.participation === "half"} onChange={() => setPart("half")} disabled={!my} />
          半程
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card title={`✅ 确定来（${confirmed.length}）`} list={confirmed} profiles={state.profiles} />
        <Card title={`❓ 待定（${tentative.length}）`} list={tentative} profiles={state.profiles} />
      </div>

      <div style={{ marginTop: 16, borderTop: "1px dashed #ddd", paddingTop: 12 }}>
        <button
          style={{ padding: "10px 12px", borderRadius: 10 }}
          onClick={() => {
            const next = { ...state, session: { ...state.session, status: "started" } };
            setState(next);
            save(next);
          }}
        >
          开始活动（演示：锁定接龙）
        </button>
      </div>
    </div>
  );
}

function Card({ title, list, profiles }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>{title}</div>
      {list.length === 0 ? <div style={{ opacity: 0.7 }}>暂无</div> : null}
      <div style={{ display: "grid", gap: 8 }}>
        {list.map((s, i) => (
          <div key={s.id} style={{ display: "flex", gap: 10 }}>
            <div style={{ width: 20, textAlign: "right", opacity: 0.7 }}>{i + 1}.</div>
            <div style={{ fontWeight: 600 }}>{profiles[s.userId]?.nickname || "(未知)"}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{s.participation === "full" ? "全程" : "半程"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Billing({ state, setState }) {
  const confirmed = state.signups.filter((s) => s.status === "confirmed");
  const [courtFee, setCourtFee] = useState(state.billing.courtFee);
  const [lines, setLines] = useState(state.billing.lines);

  const lineCosts = lines.map((l) => (Number(l.tubePrice || 0) / Number(l.ballsPerTube || 12)) * Number(l.ballsUsed || 0));
  const shuttleTotal = lineCosts.reduce((a, b) => a + b, 0);
  const total = Number(courtFee || 0) + shuttleTotal;

  const weightSum = confirmed.reduce((s, x) => s + (x.participation === "full" ? 1 : 0.5), 0);
  const unit = weightSum > 0 ? total / weightSum : 0;

  function persist(nextCourtFee, nextLines) {
    const next = { ...state, billing: { courtFee: nextCourtFee, lines: nextLines } };
    setState(next);
    save(next);
  }

  return (
    <div>
      <div style={{ fontWeight: 800, marginBottom: 10 }}>计费（独立页面）</div>

      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ width: 60, opacity: 0.8 }}>场费</div>
          <input
            value={courtFee}
            onChange={(e) => {
              setCourtFee(e.target.value);
              persist(e.target.value, lines);
            }}
            placeholder="例如 120"
            style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
          />
        </div>
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>球费（可多行）</div>

        <div style={{ display: "grid", gap: 10 }}>
          {lines.map((l, idx) => (
            <div key={l.id} style={{ border: "1px solid #f0f0f0", borderRadius: 12, padding: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8 }}>
                <input
                  value={l.tubePrice}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx] = { ...l, tubePrice: e.target.value };
                    setLines(next);
                    persist(courtFee, next);
                  }}
                  placeholder="桶价(元) 120"
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
                />
                <input
                  value={l.ballsPerTube}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx] = { ...l, ballsPerTube: e.target.value };
                    setLines(next);
                    persist(courtFee, next);
                  }}
                  placeholder="每桶球数(默认12)"
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
                />
                <input
                  value={l.ballsUsed}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx] = { ...l, ballsUsed: e.target.value };
                    setLines(next);
                    persist(courtFee, next);
                  }}
                  placeholder="用球数 2"
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
                />
                <button
                  onClick={() => {
                    const next = lines.filter((x) => x.id !== l.id);
                    const safe = next.length ? next : [{ id: uid(), tubePrice: "", ballsPerTube: "12", ballsUsed: "" }];
                    setLines(safe);
                    persist(courtFee, safe);
                  }}
                >
                  删除
                </button>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>本行球费：{(lineCosts[idx] || 0).toFixed(2)} 元</div>
            </div>
          ))}

          <button
            style={{ padding: "10px 12px", borderRadius: 10 }}
            onClick={() => {
              const next = [...lines, { id: uid(), tubePrice: "", ballsPerTube: "12", ballsUsed: "" }];
              setLines(next);
              persist(courtFee, next);
            }}
          >
            + 添加一行球费
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
        <div>球费合计：<b>{shuttleTotal.toFixed(2)}</b> 元</div>
        <div>总费用：<b>{total.toFixed(2)}</b> 元</div>
        <div style={{ marginTop: 6, opacity: 0.8 }}>仅“确定来”分摊；全程=1，半程=0.5；每权重：{unit.toFixed(2)} 元</div>
      </div>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState(() => {
    const loaded = load();
    if (loaded) return loaded;
    return {
      profiles: {},
      session: {
        title: "周末羽毛球",
        time: "今晚 19:00-21:00",
        location: "某某体育馆",
        status: "draft",
      },
      signups: [],
      billing: {
        courtFee: "",
        lines: [{ id: uid(), tubePrice: "", ballsPerTube: "12", ballsUsed: "" }],
      },
    };
  });

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home state={state} setState={setState} />} />
        <Route path="/billing" element={<Billing state={state} setState={setState} />} />
      </Routes>
    </Shell>
  );
}


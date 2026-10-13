"use client";
import { useEffect, useState } from "react";

type Row = { code: string; name: string; avg: number; qty: number; price: number | null; error: string | null };
const won = (n: number) => `₩${Math.round(n).toLocaleString("ko-KR")}`;
const pct = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(2)}%`;

/** Where the current price stands against the average price you bought at. For reference only, not investment advice. */
export default function LocalStocks() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");
  const [at, setAt] = useState("");
  const [f, setF] = useState({ code: "", name: "", avg: "", qty: "" });

  const load = async () => {
    setErr("");
    const r = await fetch("/api/local/stocks", { cache: "no-store" });
    if (!r.ok) return setErr("불러오지 못했어요. 이 페이지는 이 PC(localhost)에서만 열려요.");
    setRows(await r.json());
    setAt(new Date().toLocaleTimeString("ko-KR"));
  };
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("/api/local/stocks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    if (!r.ok) return setErr("입력을 확인해 주세요. 종목코드는 6자리 숫자예요.");
    setF({ code: "", name: "", avg: "", qty: "" });
    load();
  };
  const del = async (code: string) => { await fetch(`/api/local/stocks?code=${code}`, { method: "DELETE" }); load(); };

  const priced = (rows ?? []).filter((r) => r.price !== null && r.qty > 0);
  const buy = priced.reduce((s, r) => s + r.avg * r.qty, 0), now = priced.reduce((s, r) => s + r.price! * r.qty, 0);

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "32px 16px", display: "flex", flexDirection: "column", gap: 20 }}>
      <header className="row between">
        <h1>내 주식 (로컬 전용)</h1>
        <button className="btn" onClick={load}>새로고침{at && ` · ${at}`}</button>
      </header>

      {priced.length > 0 && (
        <dl className="summary">
          <div><dd>{won(buy)}</dd><dt>총 매입</dt></div>
          <div><dd>{won(now)}</dd><dt>총 평가</dt></div>
          <div><dd style={{ color: now >= buy ? "#ff6b6b" : "#5b9bff" }}>{won(now - buy)} ({pct(((now - buy) / buy) * 100)})</dd><dt>평가 손익</dt></div>
        </dl>
      )}
      {err && <p className="error">{err}</p>}

      <form className="panel entry" onSubmit={add}>
        <input placeholder="종목코드 (예: 005930)" inputMode="numeric" maxLength={6} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} />
        <input placeholder="이름 (선택)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input placeholder="내 평단 (원)" inputMode="numeric" value={f.avg} onChange={(e) => setF({ ...f, avg: e.target.value.replace(/[^\d.]/g, "") })} />
        <input placeholder="수량 (선택)" inputMode="numeric" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value.replace(/[^\d]/g, "") })} />
        <button className="btn primary" disabled={!f.code || !f.avg}>추가</button>
      </form>

      <div className="list">
        {rows === null && <p className="muted">불러오는 중…</p>}
        {rows?.length === 0 && <p className="muted">종목을 추가하면 현재가와 내 평단을 비교해 보여줘요.</p>}
        {rows?.map((r) => {
          const diff = r.price === null ? null : ((r.price - r.avg) / r.avg) * 100;
          return (
            <div className="item static erow noChip" key={r.code}>
              <div className="emain">
                <span className="etop"><b>{r.name}</b><span className="ecat">{r.code}{r.qty > 0 && ` · ${r.qty.toLocaleString("ko-KR")}주`}</span></span>
                <span className="ememo">
                  평단 {won(r.avg)}{r.price !== null && ` → 현재 ${won(r.price)}`}
                  {r.error && <span className="error"> · {r.error}</span>}
                </span>
              </div>
              <div className="eside solo">
                {diff !== null && (
                  <span className="tag" style={{ color: diff >= 0 ? "#ff6b6b" : "#5b9bff", borderColor: "currentColor" }}>
                    {diff >= 0 ? "평단 위" : "평단 아래"} {pct(diff)}
                  </span>
                )}
                <span className="acts"><button className="btn icon ghost" onClick={() => del(r.code)} aria-label="삭제">✕</button></span>
              </div>
            </div>
          );
        })}
      </div>
      <small className="muted">참고용 정보예요. 투자 조언이 아니고, 시세는 지연되거나 틀릴 수 있어요. 이 페이지와 키는 이 PC에서만 쓰여요.</small>
    </main>
  );
}

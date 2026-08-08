import { useEffect, useMemo, useState } from 'react';
import { loadReferenceData } from '../lib/referenceLoader';
import type { ReferenceData } from '../types/reference';

function isStructuralPeriodicGap(period: number, group: number) {
  return (
    (period === 1 && group > 1 && group < 18) ||
    ((period === 2 || period === 3) && group >= 3 && group <= 12)
  );
}

export function ReferenceRoute() {
  const [data, setData] = useState<ReferenceData>();
  const [error, setError] = useState<string>();
  const [query, setQuery] = useState('');

  useEffect(() => {
    void loadReferenceData()
      .then(setData)
      .catch(() =>
        setError('Không tải được bảng tra cứu. Hãy thử tải lại trang.')
      );
  }, []);

  const elements = useMemo(
    () =>
      data?.elements.elements.filter((element) =>
        `${element.symbol} ${element.name}`
          .toLocaleLowerCase('vi')
          .includes(query.trim().toLocaleLowerCase('vi'))
      ) ?? [],
    [data, query]
  );

  if (error)
    return (
      <p className="rounded-3xl bg-white p-5 text-ember shadow-card">{error}</p>
    );
  if (!data)
    return (
      <p className="rounded-3xl bg-white p-5 shadow-card">
        Đang tải bảng tra cứu…
      </p>
    );

  const periodic = new Map(
    data.elements.elements.map((element) => [
      `${element.period}-${element.group}`,
      element
    ])
  );
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-ink p-6 text-white shadow-card">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
          Tra cứu nhanh
        </p>
        <h2 className="mt-2 font-heading text-3xl font-bold">
          Bảng tuần hoàn, tính tan và hằng số
        </h2>
        <p className="mt-3 text-sm leading-6 text-white/80">
          Dữ liệu được rút gọn theo phạm vi THCS. Xem điều kiện đi kèm trước khi
          áp dụng vào bài toán.
        </p>
      </section>

      <section className="rounded-[2rem] bg-white/85 p-5 shadow-card">
        <h3 className="font-heading text-2xl font-bold">Nguyên tố</h3>
        <label
          className="mt-4 block text-sm font-semibold"
          htmlFor="element-search"
        >
          Tìm theo tên hoặc kí hiệu
        </label>
        <input
          id="element-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="mt-2 w-full rounded-xl border border-sea/20 px-4 py-3"
          placeholder="Ví dụ: Fe hoặc sắt"
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {elements.map((element) => (
            <article className="rounded-2xl bg-mist p-4" key={element.symbol}>
              <p className="text-2xl font-bold text-sea">{element.symbol}</p>
              <p className="font-semibold">{element.name}</p>
              <p className="text-sm text-ink/70">
                Z = {element.atomicNumber} · A = {element.atomicMass}
              </p>
            </article>
          ))}
        </div>
        {elements.length === 0 ? (
          <p className="mt-4 text-sm text-ink/70">
            Không có nguyên tố phù hợp trong tập dữ liệu hiện có.
          </p>
        ) : null}
        <div className="mt-6 hidden overflow-x-auto lg:block">
          <p className="mb-2 text-sm text-ink/70">
            Lưới chỉ hiển thị từ màn hình lớn; ô “Chưa có dữ liệu” là ngoài tập
            tra cứu, không phải dữ liệu bị thiếu.
          </p>
          <div className="grid min-w-[920px] grid-cols-[4rem_repeat(18,minmax(3rem,1fr))] gap-1 text-center text-xs">
            <div className="sticky left-0 z-10 bg-white p-2" />
            {Array.from({ length: 18 }, (_, index) => (
              <div
                className="sticky top-0 bg-white p-2 font-semibold"
                key={index}
              >
                {index + 1}
              </div>
            ))}
            {Array.from({ length: 7 }, (_, period) => (
              <div className="contents" key={period}>
                <div className="sticky left-0 bg-white p-2 font-semibold">
                  {period + 1}
                </div>
                {Array.from({ length: 18 }, (_, group) => {
                  const periodNumber = period + 1;
                  const groupNumber = group + 1;
                  const element = periodic.get(
                    `${periodNumber}-${groupNumber}`
                  );
                  const structuralGap = isStructuralPeriodicGap(
                    periodNumber,
                    groupNumber
                  );
                  return (
                    <div
                      aria-hidden={structuralGap || undefined}
                      className={`min-h-14 rounded p-1 ${element ? 'bg-sea/15' : structuralGap ? 'bg-transparent' : 'bg-mist/60 text-ink/45'}`}
                      key={group}
                    >
                      {element ? (
                        <>
                          <b>{element.symbol}</b>
                          <br />
                          {element.atomicMass}
                        </>
                      ) : structuralGap ? null : (
                        'Ngoài tập tra cứu'
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-[2rem] bg-white/85 p-5 shadow-card">
          <h3 className="font-heading text-2xl font-bold">Bảng tính tan</h3>
          <p className="mt-2 text-sm text-ink/70">
            {data.solubility.conditions}
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="p-2 text-left">Ion</th>
                  {data.solubility.anions.map((anion) => (
                    <th className="p-2" key={anion}>
                      {anion}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.solubility.cations.map((cation) => (
                  <tr className="border-t" key={cation}>
                    <th className="p-2 text-left">{cation}</th>
                    {data.solubility.anions.map((anion) => (
                      <td className="p-2 text-center" key={anion}>
                        {data.solubility.matrix[cation][anion]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-ink/70">
            {Object.entries(data.solubility.legend)
              .map(([key, label]) => `${key}: ${label}`)
              .join(' · ')}
          </p>
        </article>
        <article className="rounded-[2rem] bg-white/85 p-5 shadow-card">
          <h3 className="font-heading text-2xl font-bold">Hằng số</h3>
          <p className="mt-2 text-sm text-ink/70">
            {data.constants.conditions}
          </p>
          <dl className="mt-4 space-y-3">
            {data.constants.constants.map((entry) => (
              <div className="rounded-xl bg-mist p-3" key={entry.id}>
                <dt className="font-semibold">{entry.name}</dt>
                <dd>
                  {entry.value} {entry.unit}
                </dd>
              </div>
            ))}
          </dl>
          <h3 className="mt-6 font-heading text-xl font-bold">Dãy hoạt động</h3>
          <p className="mt-2 rounded-xl bg-mist p-3 font-semibold">
            {data.activitySeries.series.join(' → ')}
          </p>
        </article>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-[2rem] bg-white/85 p-5 shadow-card">
          <h3 className="font-heading text-2xl font-bold">
            Hoá trị thường gặp
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            {data.valences.entries.map((entry) => (
              <li key={entry.formula}>
                <b>{entry.formula}</b> — {entry.name}:{' '}
                {entry.valences.join(', ')}
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded-[2rem] bg-white/85 p-5 shadow-card">
          <h3 className="font-heading text-2xl font-bold">
            Kết tủa thường gặp
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            {data.precipitates.entries.map((entry) => (
              <li key={entry.formula}>
                <b>{entry.formula}</b> — {entry.color}; {entry.note}
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}

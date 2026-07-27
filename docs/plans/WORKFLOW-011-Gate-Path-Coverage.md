# WORKFLOW-011: Phân loại có chủ đích 24 đường dẫn đang rơi vào fail-closed

## Status

- Status: APPROVED <!-- DRAFT | APPROVED | SUPERSEDED -->
- Owner: Claude Code (Planner; dispatch của tuann2 ngày 2026-07-26)
- Revision 1 (2026-07-27): sửa theo review vòng 1 của Codex — 2 blocking,
  2 major, 2 minor. `tests/security/**`, `CLAUDE.md` và
  `.claude/skills/feature-delivery/SKILL.md` chuyển từ nhóm bị hạ gate về
  Nhóm A giữ `full`; thiết kế test chống mọc lại bỏ allowlist tự do; cập nhật
  mẫu số 233 → 235. Chi tiết ở từng mục dưới.
- Review vòng 2 (2026-07-27, Codex, effort high, execution mới): **APPROVE**,
  6/6 finding vòng 1 đóng đúng, không finding mới. Reviewer tự đo lại tập
  không-khớp và ra đúng 24/235 khớp revision 1. Nó cũng kiểm ba câu hỏi về hệ
  quả của chính bản sửa: Nhóm A phình to có mục nào thừa `full` không (không),
  lý do giữ Nhóm C ở `docs` có vững không (có — không script nào đọc hai file
  đó, và `full` cũng không kiểm được tính chính xác tường thuật của chúng), và
  assert-rỗng có gây ma sát phản tác dụng không (không — đường dẫn mới trước
  đây vẫn bị fail-closed sang `full`; test chỉ buộc ghi rõ quyết định thay vì
  để nợ tích luỹ).
- Reviewer nêu giới hạn: chưa có implementation diff, test, handoff hay evidence
  nên chưa xác nhận được regex, thứ tự rule và thông báo lỗi thực tế. Những thứ
  đó thuộc vòng review sau khi implement.
- Approved by / date: tuann2, 2026-07-27 — duyệt nội dung plan (revision 1) qua
  PR #36.
- **Revision 2 (2026-07-27) — mở rộng phạm vi, tuann2 duyệt riêng.** Thêm
  `tests/scripts/classify-change.test.ts` vào In scope. Lý do: test
  "fails closed to full for unrecognized paths" dùng
  `supabase/migrations/20260718_add_table.sql` làm ví dụ đường dẫn chưa nhận
  diện; sau khi plan này viết rule cho `supabase/(migrations|rollbacks)/**` thì
  đường dẫn đó không còn unrecognized, `fallbackToFull` thành `false` và test
  đỏ. Fixture hết hạn chứ không phải logic sai — chỉ cần đổi sang một đường dẫn
  tổng hợp thật sự chưa phân loại, không đụng `classify-change.ts`.
  Thiếu sót này thuộc về Planner: file đó chắc chắn phải sửa mà bản đầu không
  liệt kê. Implementer phát hiện khi chạy test và dừng đúng envelope thay vì tự
  sửa file ngoài phạm vi. Rủi ro không tăng: vẫn ELEVATED, vẫn `scripts/**` +
  test, fail-closed giữ nguyên.
- **Phê duyệt đích danh theo `AGENTS.md` mục 6 (ghi tách bạch, không suy ra từ
  việc duyệt plan):** tuann2, 2026-07-27, chấp thuận thu hẹp phạm vi gate từ
  `full` xuống `docs` cho **đúng hai đường dẫn**: `CHANGELOG.md` và
  `PROJECT_STORY.md`. Không đường dẫn nào khác được hạ gate dưới plan này.
  Deviation tương ứng phải được ghi lại trong handoff khi thực thi.
- Risk tier: ELEVATED
- Risk categories and escalation rationale: governance-enforcement tooling —
  sửa `scripts/gates-manifest.ts` là sửa logic quyết định gate nào chạy cho
  thay đổi nào, cùng lớp rủi ro với WORKFLOW-004C (classifier TRIVIAL) và
  WORKFLOW-007. Không sửa `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md`,
  không đụng CI/deploy, nên không CRITICAL. ELEVATED chỉ đúng **vì** revision 1
  đã đưa `tests/security/**` về Nhóm A: nếu còn hạ nó xuống `web` thì Risk Model
  rule 2 (security control) buộc nâng plan lên CRITICAL.
- **Yêu cầu riêng theo `AGENTS.md` mục 6:** một phần thay đổi này **thu hẹp**
  phạm vi gate cho vài đường dẫn. Mục 6 đòi phê duyệt rõ ràng của con người kèm
  deviation ghi lại, và không envelope nào cấp được quyền đó. Danh sách chính
  xác các đường dẫn bị thu hẹp nằm ở Nhóm C bên dưới, sau revision 1 chỉ còn
  **đúng 2 file**: `CHANGELOG.md` và `PROJECT_STORY.md`. Duyệt plan này là duyệt
  đúng hai file đó, không phải duyệt chung chung.
- Change type and required gate profile: toolchain (`scripts/**` + test) —
  profile `full`.

## Objective and scope

- Objective: **24/235** file tracked không khớp rule nào trong `PATH_GATE_RULES`
  (đo ngày 2026-07-27 trên `origin/main` = `0830c78`; bản đầu ghi 24/233 theo
  base cũ `4490a0a`, danh sách 24 mục không đổi), chỉ được bảo vệ nhờ fail-closed
  `'unrecognized path; fail closed to full'`. Phân loại chúng có chủ đích, và
  thêm test để khoảng trống này không âm thầm mọc lại.
- In scope: `scripts/gates-manifest.ts`, `tests/scripts/gates-manifest.test.ts`,
  `tests/scripts/classify-change.test.ts`,
  `docs/handoffs/WORKFLOW-011-implementation.md`.
- Out of scope: đổi định nghĩa profile (`WEB_/DOCS_/BROWSER_/FULL_PROFILE_GATE_IDS`);
  đụng `classify-change.ts` hay cơ chế fail-closed — fail-closed **phải giữ
  nguyên** làm lưới an toàn cuối; WORKFLOW-009 (PR #33, file rời nhau, chạy
  song song được).

## Current analysis and design

Hiện trạng **không có gì bị dưới-kiểm**: fail-closed cho chạy _nhiều_ gate hơn
mức cần. Vấn đề là chưa ai **quyết định** những đường dẫn này thuộc profile nào,
nên an toàn đang dựa vào cơ chế dự phòng chứ không dựa vào chủ đích — và mọi sửa
đổi nhỏ ở các đường dẫn đó đều kéo cả 15 gate.

Đáng chú ý nhất là những thứ lẽ ra phải được phân loại tường minh:

| Đường dẫn                                                           | Vì sao đáng phân loại tường minh                                                      |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `supabase/migrations/**`, `supabase/rollbacks/**`                   | Migration — Risk Model rule 5 xếp ít nhất ELEVATED; classifier không có khái niệm này |
| `docs/security/audit-allowlist.json`                                | Thêm một dòng ở đây là triệt tiêu một finding `npm audit` — security control          |
| `scripts/cli.ts`, `check-audit.ts`, `check-branch-context-drift.ts` | Toolchain/gate script nằm ngoài rule toolchain; `cli.ts` được 8 script khác import    |

### Phân nhóm đề xuất

Bản này là **revision 1**, sửa theo review vòng 1 của Codex ngày 2026-07-27.
Hai đường dẫn bị xếp sai nhóm ở bản đầu đã chuyển về Nhóm A; lý do ghi ngay dưới.

**Nhóm A — giữ nguyên `full`, chỉ viết rule cho tường minh. Không đổi hành vi.**
`supabase/migrations/**`, `supabase/rollbacks/**`, `docs/security/audit-allowlist.json`,
`scripts/cli.ts`, `scripts/check-audit.ts`, `scripts/check-branch-context-drift.ts`,
`postcss.config.js`, `tailwind.config.js`, `.prettierrc.json`, `.env.example`,
`.gitignore`, `.codex/config.toml`, `docs/trace/trivial/.gitkeep`,
**`tests/security/**`**, **`CLAUDE.md`**, **`.claude/skills/feature-delivery/SKILL.md`\*\*.

Ba mục in đậm là sửa từ review vòng 1:

- `tests/security/admin-migration.test.ts` không phải test ứng dụng thường. Nó
  kiểm contract bảo mật của FEATURE-016: RLS policy own-read/admin-select,
  `revoke all on table ... from public, anon, authenticated`, `security definer`,
  grant tối thiểu cho RPC, và đường rollback. Risk Model rule 2 xếp thay đổi
  security control là CRITICAL. Hạ nó xuống `web` là bỏ mất browser + docs gates
  cho đúng lớp file đáng canh chặt nhất.
- `CLAUDE.md` và `.claude/skills/feature-delivery/SKILL.md` điều khiển hành vi
  agent, không phải văn xuôi. `scripts/trivial-policy.ts:65` đã tự xếp
  `^\.claude/` là "workflow shims" và cấm TRIVIAL; `SKILL.md` quy định envelope,
  role, gate, evidence, review và human approval. Gate `docs` chỉ quét link
  markdown, path và `npm run` reference — nó không xác thực directive
  `@AGENTS.md`, không đối chiếu policy, không kiểm ngữ nghĩa chỉ thị. Dùng nó để
  canh hai file này là dùng sai công cụ.

**Nhóm B — chuyển sang `web`.** `tests/hooks/**`,
`tests/fixtures/check-licenses/**` — test và fixture của mã ứng dụng và của
script, đúng lớp mà rule tests hiện có đã phủ cho
`tests/{components,lib,routes,store}`.

**Nhóm C — chuyển sang `docs`. Đây là phần THU HẸP gate, cần duyệt đích danh:**
`CHANGELOG.md`, `PROJECT_STORY.md`.

Chỉ còn hai file, đều là bản ghi lịch sử cho người đọc, không điều khiển hành vi
agent và không được script nào đọc. `check-docs` phủ đúng thứ cần kiểm ở chúng:
link, đường dẫn, lệnh `npm run`.

### Chống mọc lại

Thêm test vào `tests/scripts/gates-manifest.test.ts`: liệt kê file tracked bằng
`git ls-files -z` (dùng `-z` để không giả định tên file không chứa newline), đối
chiếu với `PATH_GATE_RULES`, và **mặc định khẳng định tập không-khớp là RỖNG**.

Bản đầu của plan đề xuất một allowlist tự do cho tập không-khớp. Review vòng 1
chỉ ra đó là lối bypass dễ nhất: người thêm file mới chỉ cần thêm một dòng vào
allowlist là test xanh, mà không có quyết định `PATH_GATE_RULES` nào — tức cơ
chế tự vô hiệu hoá đúng mục tiêu nó sinh ra để đạt. Bỏ thiết kế đó.

Nếu về sau thật sự cần một ngoại lệ, nó phải là mục có cấu trúc: đường dẫn chính
xác (không phải glob), lý do, người chịu trách nhiệm, ngày rà lại; và test
khẳng định riêng cho từng mục. Ngoại lệ khi đó là một quyết định có tên người và
có hạn, không phải một dòng thêm vào cho qua.

Fail-closed trong `classify-change.ts` giữ nguyên làm lưới an toàn cuối.

- New technology: không có.
- Execution profile + degradation path: Implementer cần repo-rw + shell + test.
  Nếu `tsx` bị EPERM không chạy được `npm test` (hạn chế đã biết của profile
  `codex-claude-subagent`), báo rõ và để orchestrator chạy gate/evidence —
  không được tự khai gate pass.

## Delivery plan

Execution assignment — mỗi dòng cần xác nhận riêng khi đến lượt vai đó:

| Vai trò              | Agent đề xuất                | Model / effort | Lý do                                                                                                             | Đã xác nhận                                |
| -------------------- | ---------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Planner              | Claude Code                  | high           | Đã đo tập không-khớp bằng chính `PATH_GATE_RULES` và phân nhóm theo rủi ro.                                       | tuann2, 2026-07-26 (dispatch "ok soạn đi") |
| Implementer          | Codex (`codex:codex-rescue`) | high           | Không tự nhận: đây là `scripts/**` + test, đúng loại "substantial" mà Responsibility Matrix cấm Planner tự làm.   | tuann2, 2026-07-27                         |
| Independent Reviewer | Codex fresh (`--fresh`)      | high           | ELEVATED cần một reviewer tươi đọc từng dòng; cần đọc được logic regex + chạy test, nên ưu tiên profile có shell. | chưa                                       |
| Release Assessor     | Claude Code                  | low            | Khác Implementer.                                                                                                 | chưa                                       |

1. Thêm rule cho Nhóm A và B vào `PATH_GATE_RULES`, giữ nguyên thứ tự ưu tiên
   hiện có (rule đứng trước thắng).
2. Thêm rule Nhóm C sau khi tuann2 duyệt đích danh 2 file: `CHANGELOG.md`,
   `PROJECT_STORY.md`.
3. Thêm test chống mọc lại + test cho từng nhóm mới.
4. Chạy `npm run gates -- --changed-from=<base_sha>` và `npm run evidence`,
   viết handoff. Kiểm chứng cuối: chạy lại phép đo và xác nhận tập không-khớp
   là **rỗng**.

## Risks and controls

| Risk                                                     | Impact                                      | Mitigation                                                                                                                         |
| -------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Rule mới quá rộng, nuốt đường dẫn đáng lẽ phải chạy full | Thay đổi rủi ro cao lọt qua với ít gate hơn | Rule neo `^...$` hoặc tiền tố thư mục hẹp; test khẳng định từng nhóm map đúng profile; reviewer đọc từng regex.                    |
| Thứ tự rule làm rule cũ bị che                           | Đường dẫn đang đúng bị phân loại sai        | Rule đầu tiên khớp sẽ thắng — test hiện có đã khoá hành vi của các rule cũ; không đổi thứ tự rule cũ.                              |
| Test chống mọc lại gây phiền khi thêm file mới           | Người ta xoá test cho nhanh                 | Thông báo lỗi phải chỉ đúng file chưa phân loại và nhắc viết rule; không còn lối thêm một dòng allowlist cho qua.                  |
| Thu hẹp gate cho Nhóm C bỏ sót rủi ro                    | Sửa 2 file đó chỉ còn chạy gate docs        | Cả 2 là bản ghi lịch sử cho người đọc, không điều khiển hành vi agent, không script nào đọc; `check-docs` phủ đúng link/path/lệnh. |

## Acceptance and recovery

- [ ] `PATH_GATE_RULES` phủ hết 24 đường dẫn; tập không-khớp còn lại là rỗng.
- [ ] Nhóm A vẫn ra profile `full` — chứng minh bằng test, không đổi hành vi.
- [ ] Nhóm B ra `web`; Nhóm C ra `docs` và chỉ gồm `CHANGELOG.md` +
      `PROJECT_STORY.md`.
- [ ] `tests/security/**`, `CLAUDE.md`, `.claude/skills/**` vẫn ra `full`.
- [ ] Mỗi regex mới có test kiểm hành vi "rule đầu tiên khớp thắng", không chỉ
      kiểm profile cuối cùng.
- [ ] Test chống mọc lại dùng `git ls-files -z`, mặc định assert tập không-khớp
      rỗng, và đỏ khi thêm một đường dẫn chưa phân loại.
- [ ] Cơ chế fail-closed trong `classify-change.ts` không bị đụng tới.
- [ ] Handoff ghi kết quả phép đo tập không-khớp trước và sau.
- Security considerations: không đụng auth, secret, dependency, CI/deploy. Thay
  đổi ảnh hưởng phạm vi gate — xem yêu cầu `AGENTS.md` mục 6 ở mục Status.
- API/database impact: không.
- Test strategy: test đơn vị cho từng nhóm + test chống mọc lại; profile `full`
  chạy đủ vì thay đổi nằm ở `scripts/**`.
- Rollback plan: một commit → `git revert <sha>`; fail-closed vẫn còn nguyên nên
  revert đưa về đúng hành vi an toàn hiện tại.

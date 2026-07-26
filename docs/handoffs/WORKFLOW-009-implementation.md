# WORKFLOW-009 Implementation Handoff

## Status

- Remediation state: REVIEWING — remediation round 1 đã đóng 5 finding; chờ
  re-review xác nhận hoặc quyết định của Human Approver, xem Release Assessment.
- Risk tier / categories / escalation rationale: ELEVATED; governance policy
  governing role acceptance and release-assessment recording. The approved plan
  classifies uncertain governance impact at the higher plausible tier.
- Base SHA / candidate SHA: f04e2b14d28a0974bd8f61814c5194eedbea5768 / UNCOMMITTED
- Worktree state and dirty paths: dirty; `AGENTS.md`,
  `docs/handoffs/_TEMPLATE.md`, `docs/handoffs/WORKFLOW-009-implementation.md`,
  and `docs/plans/_TEMPLATE.md`
- CI reference for exact candidate (when required/available): PENDING

## Summary and scope

- Requested scope and outcome: add visible role-confirmation and release-
  assessment records to the templates and repository instructions.
- Files changed: `AGENTS.md`, `docs/handoffs/_TEMPLATE.md`,
  `docs/handoffs/WORKFLOW-009-implementation.md`, and
  `docs/plans/_TEMPLATE.md`.
- `git diff --stat`: `3 files changed, 34 insertions(+), 7 deletions(-)`; this
  command does not include this untracked handoff, which is listed above.

## Role execution log

| Role                 | Executing agent                  | Model / effort | Human confirmer + timestamp | Execution evidence                                                                                                                                                                 |
| -------------------- | -------------------------------- | -------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planner              | Claude Code                      | not recorded   | tuann2, 2026-07-26          | Dispatch: “hãy lên plan”                                                                                                                                                           |
| Implementer          | Codex                            | medium         | tuann2, 2026-07-26          | This official implementation dispatch                                                                                                                                              |
| Independent Reviewer | agy (`claude-opus-4-6-thinking`) | —              | tuann2, 2026-07-26          | Verdict CHANGES_REQUESTED, 5 finding; xem mục Independent verification. Vai này ban đầu giao Codex `gpt-5.6-terra`, đổi người sau khi Codex treo 2 lần liên tiếp không ra verdict. |
| Release Assessor     | Claude Code                      | low            | tuann2, 2026-07-26          | Đánh giá ở mục Release Assessment                                                                                                                                                  |

## Acceptance, decisions, and risks

| Plan acceptance criterion                                                                       | Evidence / status                                                                   |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Handoff template has both required sections, the `RELEASE_READY` rule, and dated grandfathering | Implemented; pending independent review                                             |
| Plan template has a confirmation-status column                                                  | Implemented; pending independent review                                             |
| AGENTS.md requires separate role confirmation and distinguishes it from scope confirmation      | Implemented; pending independent review                                             |
| This handoff uses and completes both new sections                                               | Complete: role log is populated and assessment truthfully records its pending state |
| A fresh independent reviewer reads every changed line                                           | PENDING: no reviewer has been separately confirmed                                  |

- Design decisions: kept the existing templates' language conventions; the
  release-state rule and grandfather cut-off are explicit in the handoff
  template.
- Deviations: none.
- Blockers: Independent Reviewer and Release Assessor have not been confirmed.
- Remaining risks / follow-up: documentation discipline is not machine
  enforcement; the approved plan records a possible future gate if empty logs
  persist.

## Validation evidence

**Ghi chú của orchestrator.** Job Implementer vòng 1 (Codex,
`task-ms1xiuhs-pknldf`) không bao giờ báo kết thúc: log dừng ở "Turn started"
lúc 15:04:50 suốt 38 phút, trong khi các job khoẻ mạnh ghi log liên tục. Bốn
file đã ghi xong trong khoảng 15:05:50 → 15:07:16 và orchestrator kiểm từng file
không bị cắt giữa chừng trước khi dùng. Remediation round 1 do một job Codex
khác thực hiện và kết thúc bình thường trong 88 giây.

Evidence của Implementer phải thay vì sandbox không ghi được git index nên nó
dùng manifest fallback (đã khai báo trung thực kèm nguyên văn lỗi). Bản evidence
thứ hai của orchestrator cũng bị bỏ: nó được đo **trước** khi handoff sửa xong
rồi commit, nên không bind vào candidate — chính là finding F-7.

**Bản dưới đây bind chính xác.** Đo trên worktree sạch ngay sau commit
`26d9f3df48ff4b43086f266262bd3eb0b6686123`:
`npm run evidence -- --changed-from=f04e2b14`, 3/3 gate exit 0, profile `docs`,
`snapshot_fallback_reason: null`, snapshot git-tree
`43a4a2f9d09edcc20c7d69554871dd911e5bf922` — **bằng đúng tree của commit
`26d9f3d`** (`git rev-parse 26d9f3d^{tree}` cho cùng giá trị).

Độ lệch còn lại là chính khối JSON này, được thêm ở commit kế tiếp. Evidence
bind vào `26d9f3d` chứ không bind vào commit chứa nó — giới hạn cố hữu của
handoff nằm trong cây mã, đã ghi thành follow-up mở ở handoff WORKFLOW-008.

```json
{
  "base_sha": "26d9f3df48ff4b43086f266262bd3eb0b6686123",
  "build_inputs": [
    {
      "path": ".env.example",
      "sha256": "6fda9c2a4670086a9b4784c5f146ae59df4ecb2f00410b89973483837bd16198"
    }
  ],
  "candidate_sha": "26d9f3df48ff4b43086f266262bd3eb0b6686123",
  "finished_at": "2026-07-26T22:57:36.889Z",
  "gate_results": [
    {
      "id": "git-diff-check",
      "command": ["git", "diff", "--check"],
      "durationMs": 5,
      "exitCode": 0
    },
    {
      "id": "format-check",
      "command": ["npm", "run", "format:check"],
      "durationMs": 7087,
      "exitCode": 0
    },
    {
      "id": "docs-check",
      "command": ["npm", "run", "check:docs", "--", "--all"],
      "durationMs": 410,
      "exitCode": 0
    }
  ],
  "lockfile_sha256": "fcb9e26c85ffd1a43eec0a56a0cd2cb9b0a6d3a543e68f941989f03416f9c656",
  "node_version": "v24.16.0",
  "npm_version": "11.13.0",
  "result": "pass",
  "snapshot_fallback_reason": null,
  "schema_version": 1,
  "started_at": "2026-07-26T22:57:29.260Z",
  "validated_snapshot": {
    "id": "43a4a2f9d09edcc20c7d69554871dd911e5bf922",
    "kind": "git-tree"
  }
}
```

## Independent verification

- Verifier / execution identifier / independence method: `agy`, model
  `claude-opus-4-6-thinking` — lớp "strong structural reasoning" theo tiêu chí
  vừa lập ở `docs/runbooks/providers/antigravity.md` (WORKFLOW-010). Execution
  mới, không thừa hưởng transcript của Implementer, envelope read-only.
- **Đổi người giữa chừng:** vai này ban đầu giao Codex `gpt-5.6-terra` effort
  high. Codex treo **hai lần liên tiếp**, không lần nào ra verdict. Lần hai nó
  kịp tìm ra một finding thật (evidence không bind candidate — ghi thành F-7)
  trước khi log đứng yên. tuann2 xác nhận đổi reviewer sang agy ngày 2026-07-26.
- **Giới hạn về cách cấp nội dung:** agy headless tự từ chối tool cần quyền
  `command`. Orchestrator không dùng `--dangerously-skip-permissions` vì cờ đó
  cấp cả quyền ghi, trái envelope read-only. Thay vào đó dán nguyên văn: diff
  đầy đủ 4 file, cấu trúc mục của template sau thay đổi, trích đoạn architecture
  để đối chiếu, và tiêu chí acceptance của plan. Reviewer chỉ thấy thứ được cấp;
  chính nó cũng tự ghi rằng không kiểm được SHA, kết quả gate, và ghi chú về
  tiến trình Codex — không tự nhận đã xác minh những thứ đó.
- Exact candidate CI status: xem mục Validation evidence; CI chạy trên PR #37.
- **Findings and disposition — verdict CHANGES_REQUESTED, 5 finding, tất cả đã
  đóng ở remediation round 1:**

| Mã  | Mức    | Nội dung                                                                                                        | Xử lý                                                       |
| --- | ------ | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| F-1 | High   | Template đặt `Release Assessment` trước `Independent verification`, ngược trình tự architecture quy định        | Đã đảo thứ tự ở cả template và handoff                      |
| F-2 | Medium | Điều kiện "while this section is empty" quá lỏng: mặc định template là `PENDING`, vốn không rỗng, nên lách được | Đổi thành "contains only placeholders or template defaults" |
| F-3 | Low    | Code span vắt qua hai dòng; thụt lề dòng tiếp nối không nhất quán                                               | Giữ code span một dòng, chuẩn hoá thụt lề                   |
| F-4 | Low    | Mục 7 im lặng về nghĩa vụ chuyển tiếp xác nhận của bên điều phối                                                | Thêm nghĩa vụ relay kèm tham chiếu kiểm chứng được          |
| F-5 | Low    | Handoff kế thừa F-1                                                                                             | Đóng theo F-1                                               |

Hai finding bổ sung ngoài báo cáo của agy, do orchestrator tự phát hiện và
cũng đã đóng: **F-6** — handoff trình bày một suy luận về sống/chết của tiến
trình như dữ kiện, đã thay bằng quan sát log; **F-7** — evidence không bind
candidate, đã đánh dấu STALE và sinh lại sau commit cuối.

- **Đối chiếu chất lượng review:** orchestrator giữ kín hai nhận xét riêng
  (thứ tự mục, lỗi markdown) trước khi dispatch để đo vòng review. agy tìm ra
  cả hai, cộng F-2 mà orchestrator đã đọc nhiều lần và bỏ sót. F-4 được tìm ra
  độc lập bằng hai đường: agy qua đọc văn bản, orchestrator qua sự cố thật khi
  một agent từ chối nhận vai vì dispatch thiếu bằng chứng xác nhận.
- Batch-content exception authorization: n/a

## Release Assessment

Thực hiện bởi Claude Code (vai do tuann2 xác nhận riêng ngày 2026-07-26), sau
khi vòng Independent Review đóng. Vai này khác Implementer (Codex), đúng ràng
buộc tách vai.

**Kết luận: CHƯA release-ready. Cần một trong hai điều kiện dưới đây trước khi
merge.**

### Đã kiểm và đạt

| Hạng mục                       | Kết quả                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------- |
| Phạm vi khớp plan              | 4 file, không file nào ngoài `allowed_paths`                                    |
| 5 tiêu chí acceptance của plan | Đạt cả 5; tiêu chí "handoff dùng chính template mới" là phép thử thật và đã đạt |
| Evidence bind snapshot         | Bind chính xác: snapshot `43a4a2f9` = tree của commit `26d9f3d`                 |
| Gate                           | 3/3 exit 0, profile `docs`                                                      |
| Vòng review theo tier          | Đã có, verdict CHANGES_REQUESTED, 5 finding, tất cả đã đóng                     |
| `git diff --stat`              | 4 file, thay đổi giới hạn trong phạm vi đã duyệt                                |

### Vì sao vẫn chưa release-ready

Reviewer đọc candidate `e601297`. Bản remediation `26d9f3d` **chưa execution độc
lập nào đọc**. Mà nội dung sửa không vụn vặt: F-2 thay đổi chính điều kiện kích
hoạt của quy tắc trung tâm, F-4 thêm nghĩa vụ mới vào `AGENTS.md`. Tier ELEVATED
đòi một reviewer tươi đọc từng dòng thay đổi.

Architecture có điều khoản "documentation-only change does not invalidate
completed tier reviews", và thay đổi này đúng là docs-only. Nhưng viện dẫn nó ở
đây sẽ là lạm dụng: điều khoản đó dành cho sửa tài liệu _sau khi_ mã đã được
validate, không dành cho trường hợp bản thân văn bản quản trị là đối tượng review
và vừa bị sửa ở đúng chỗ trọng yếu.

Assessor cũng không độc lập với remediation: chính tôi soạn danh sách 7 điểm sửa
và giao cho Implementer. Tôi tự xác nhận công việc do mình chỉ đạo thì không phải
kiểm tra độc lập — đó đúng là kiểu tự cấp phép mà plan này sinh ra để chặn.

### Hai đường đi hợp lệ

1. **Re-review xác nhận** trên `26d9f3d` — chỉ cần kiểm 6 điểm sửa có đóng đúng
   finding không, phạm vi hẹp hơn vòng đầu nhiều.
2. **Human Approver chấp nhận deviation có ghi chép**, dựa trên lý do: remediation
   là docs-only, từng điểm sửa bám sát finding, và gate đã xanh. Nếu chọn đường
   này thì phải ghi thành deviation ở mục trên, không phải bỏ qua im lặng.

Quyền quyết định thuộc tuann2. Assessor không tự nâng state lên `RELEASE_READY`.

<!-- Keep this handoff aligned with docs/handoffs/_TEMPLATE.md. Regenerate after
remediation; mark superseded evidence STALE. -->

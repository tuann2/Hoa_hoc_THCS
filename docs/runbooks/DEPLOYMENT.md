# Deployment Runbook

## Mục đích

Runbook này mô tả hai đường deploy GitHub Pages hiện tại:

- Đường chính: [`CI`](../../.github/workflows/ci.yml) tự deploy trên `push` vào `main` sau khi `web` và `browser` đều pass.
- Đường dự phòng: [`Deploy to GitHub Pages`](../../.github/workflows/deploy.yml) chạy tay qua `workflow_dispatch` với input bắt buộc `candidate_sha`.

## Deployment Invariant

> Artifact deploy lên production phải là chính artifact đã pass mọi gate bắt buộc (web + browser/PWA) cho đúng commit SHA đó. Browser/PWA fail ⇒ không deploy. Không đường deploy nào được bypass điều này.

Known limitation:

- Bounded deviation approved by Owner on July 18, 2026: browser/PWA gates vẫn chạy trên `test-dist`, còn artifact deploy là `production-dist` được build trong cùng CI run và cùng commit sau khi các gate pass, nhưng với production configuration (`VITE_BASE_PATH=/${repo}/`, Supabase secrets thật). Byte-level identity giữa artifact test và artifact deploy được defer sang feature sau.

## Đường deploy chính

1. Merge PR vào `main`.
2. Workflow [`CI`](../../.github/workflows/ci.yml) chạy các check `web` và `browser`.
3. Job `web` build `dist` bằng CI config hiện tại để upload thành `test-dist`; job `browser` download đúng `test-dist` này để chạy `e2e`, `pwa`, và `pwa-subpath`.
4. Sau khi `web` và `docs` gates pass, job `web` build thêm `dist-prod` bằng production configuration và upload thành `production-dist`.
5. Job `deploy` trong cùng workflow chỉ chạy khi event là `push` trên `refs/heads/main` và `needs: [web, browser]` đã thành công.
6. Job `deploy` tải lại đúng artifact `production-dist`, upload lại bằng `actions/upload-pages-artifact`, rồi deploy bằng `actions/deploy-pages`.

Lưu ý:

- Job `deploy` không rebuild ứng dụng.
- Branch protection nên require ít nhất `web` và `browser` trước khi merge.

## Đường manual dự phòng

Chỉ dùng khi đường chính không thể hoàn tất deploy dù commit đích đã pass CI, ví dụ lỗi tạm thời ở GitHub Pages.

Điều kiện trước khi chạy:

- `candidate_sha` phải là đúng 40 ký tự hex.
- Commit SHA cần deploy đã có một completed run mới nhất của workflow [`CI`](../../.github/workflows/ci.yml) với `conclusion=success`.
- Trong đúng CI run đó, hai job `web` và `browser` đều phải `completed/success`.
- Artifact `production-dist` của đúng CI run đó còn trong retention window.
- Không có deploy production khác đang chạy trong concurrency group `pages`.

Các bước:

1. Mở workflow [`Deploy to GitHub Pages`](../../.github/workflows/deploy.yml).
2. Chạy `workflow_dispatch` và nhập `candidate_sha`.
3. Workflow checkout đúng SHA đó và assert `git rev-parse HEAD == candidate_sha`; lệch là fail ngay.
4. Step `Verify required CI run, jobs, and artifact for candidate SHA` gọi GitHub API qua `gh api`, lấy completed runs của `ci.yml` cho đúng `head_sha`, chọn run mới nhất, rồi fail-closed nếu:
   - regex SHA không hợp lệ;
   - API lỗi hoặc không trả dữ liệu;
   - không có completed run nào của `ci.yml` cho SHA đó;
   - run mới nhất không có `conclusion=success`;
   - thiếu job `web` hoặc `browser`, hoặc một trong hai không ở `completed/success`;
   - thiếu artifact `production-dist` hoặc artifact đã hết hạn.
5. Chỉ sau khi guard pass, workflow mới download zip của đúng `production-dist` artifact từ đúng CI run đó, giải nén, upload Pages artifact và deploy.
6. Nếu artifact đã hết hạn, workflow sẽ fail với hướng dẫn re-run `CI` cho chính SHA đó rồi chạy lại manual deploy.

## Rollback

Rollback là re-run manual deploy với một `candidate_sha` cũ đã từng pass `web` và `browser`.

1. Chọn commit production gần nhất còn tốt.
2. Xác nhận SHA đó vẫn còn một completed `CI` run thành công, với job `web` và `browser` đều success, và artifact `production-dist` chưa hết hạn.
3. Chạy [`Deploy to GitHub Pages`](../../.github/workflows/deploy.yml) với `candidate_sha` của commit đó.
4. Theo dõi job `deploy` cho đến khi GitHub Pages trả về URL production mới.

## Sau cutover

Owner cần cập nhật GitHub UI đồng bộ với Stage 6:

- Bật yêu cầu PR trước khi merge vào `main`.
- Đặt required checks là `web` và `browser`.
- Chặn `force push` và `delete` trên `main`.

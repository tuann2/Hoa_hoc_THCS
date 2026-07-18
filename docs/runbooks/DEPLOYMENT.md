# Deployment Runbook

## Mục đích

Runbook này mô tả hai đường deploy GitHub Pages hiện tại:

- Đường chính: [`CI`](../../.github/workflows/ci.yml) tự deploy trên `push` vào `main` sau khi `web` và `browser` đều pass.
- Đường dự phòng: [`Deploy to GitHub Pages`](../../.github/workflows/deploy.yml) chạy tay qua `workflow_dispatch` với input bắt buộc `candidate_sha`.

## Deployment Invariant

> Artifact deploy lên production phải là chính artifact đã pass mọi gate bắt buộc (web + browser/PWA) cho đúng commit SHA đó. Browser/PWA fail ⇒ không deploy. Không đường deploy nào được bypass điều này.

## Đường deploy chính

1. Merge PR vào `main`.
2. Workflow [`CI`](../../.github/workflows/ci.yml) chạy các check `web` và `browser`.
3. Job `deploy` trong cùng workflow chỉ chạy khi event là `push` trên `refs/heads/main` và `needs: [web, browser]` đã thành công.
4. Job `deploy` tải lại artifact `production-dist` đã được tạo trong job `web`, upload lại bằng `actions/upload-pages-artifact`, rồi deploy bằng `actions/deploy-pages`.

Lưu ý:

- Job `deploy` không rebuild ứng dụng.
- Branch protection nên require ít nhất `web` và `browser` trước khi merge.

## Đường manual dự phòng

Chỉ dùng khi đường chính không thể hoàn tất deploy dù commit đích đã pass CI, ví dụ lỗi tạm thời ở GitHub Pages.

Điều kiện trước khi chạy:

- Commit SHA cần deploy đã có check-runs thành công cho `web` và `browser` từ app `github-actions`.
- Secrets `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` vẫn hợp lệ trong repo settings.
- Không có deploy production khác đang chạy trong concurrency group `pages`.

Các bước:

1. Mở workflow [`Deploy to GitHub Pages`](../../.github/workflows/deploy.yml).
2. Chạy `workflow_dispatch` và nhập `candidate_sha`.
3. Workflow checkout đúng SHA đó.
4. Step `Verify required CI checks for candidate SHA` gọi GitHub API qua `gh api` và fail-closed nếu:
   - API lỗi hoặc không trả dữ liệu;
   - thiếu `web` hoặc `browser` từ app `github-actions`;
   - có check-run nhưng không ở trạng thái `completed/success`.
5. Chỉ sau khi guard pass, workflow mới chạy `npm ci`, `npm run build`, upload Pages artifact và deploy.

## Rollback

Rollback là re-run manual deploy với một `candidate_sha` cũ đã từng pass `web` và `browser`.

1. Chọn commit production gần nhất còn tốt.
2. Xác nhận SHA đó vẫn có hai check-runs `web` và `browser` từ app `github-actions` ở trạng thái success.
3. Chạy [`Deploy to GitHub Pages`](../../.github/workflows/deploy.yml) với `candidate_sha` của commit đó.
4. Theo dõi job `deploy` cho đến khi GitHub Pages trả về URL production mới.

## Sau cutover

Owner cần cập nhật GitHub UI đồng bộ với Stage 6:

- Bật yêu cầu PR trước khi merge vào `main`.
- Đặt required checks là `web` và `browser`.
- Chặn `force push` và `delete` trên `main`.

'use client';

import { useState } from 'react';

export default function RulesPanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Closed-state tab — sits below the BXH tab on the right edge */}
      <button
        onClick={() => setOpen(true)}
        title="Luật chơi"
        aria-label="Xem luật chơi"
        className="hidden lg:flex fixed right-0 top-48 z-30 flex-col items-center gap-1 px-2 py-3 bg-white border border-r-0 border-gray-200 rounded-l-xl shadow-md hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition-colors"
      >
        <span className="text-base">📖</span>
        <span className="[writing-mode:vertical-rl] rotate-180 text-[11px] font-bold tracking-wide">
          Luật
        </span>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-700 to-blue-900 rounded-t-2xl flex-shrink-0">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                📖 Luật chơi
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto px-6 py-5 space-y-5 text-sm text-gray-700">

              {/* Dự đoán tỉ số */}
              <section>
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-black">1</span>
                  Dự đoán tỉ số
                </h3>
                <ul className="space-y-1.5 pl-8 list-disc text-gray-600">
                  <li>Mỗi trận đấu, bạn có thể đoán tỉ số chính xác (ví dụ: <span className="font-bold">2 – 1</span>).</li>
                  <li>Có thể thay đổi hoặc hủy dự đoán bất cứ lúc nào trước khi trận bắt đầu.</li>
                  <li>Sau khi trận bắt đầu, dự đoán bị khóa.</li>
                </ul>
              </section>

              {/* Cách tính điểm */}
              <section>
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-black">2</span>
                  Cách tính vcoins sau mỗi trận
                </h3>
                <div className="pl-8 space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                    <p className="font-semibold text-green-800 mb-1">✅ Có người đoán đúng</p>
                    <ul className="space-y-1 text-green-700 text-xs list-disc pl-4">
                      <li>Mỗi người đoán <span className="font-bold">sai</span> bị trừ <span className="font-bold">–10 vcoins</span>.</li>
                      <li>Số vcoins đó được chia đều cho những người đoán <span className="font-bold">đúng</span>.</li>
                      <li>Nhiều người đúng → chia đều; ít người đúng → mỗi người nhận nhiều hơn.</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                    <p className="font-semibold text-gray-700 mb-1">🤝 Không ai đoán đúng</p>
                    <p className="text-gray-500 text-xs">Không ai bị trừ vcoins — kết quả giữ nguyên.</p>
                  </div>
                </div>
              </section>

              {/* Vcoins */}
              <section>
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-black">3</span>
                  Vcoins
                </h3>
                <ul className="space-y-1.5 pl-8 list-disc text-gray-600">
                  <li>Mỗi tài khoản bắt đầu với <span className="font-bold">0 vcoins</span>.</li>
                  <li>Vcoins <span className="font-bold">có thể xuống âm</span> nếu thua liên tục.</li>
                  <li>Không có giới hạn trên — người đúng nhiều sẽ nhận pool lớn.</li>
                </ul>
              </section>

              {/* Dự đoán đặc biệt */}
              <section>
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-black">4</span>
                  Dự đoán đặc biệt 🌟
                </h3>
                <ul className="space-y-1.5 pl-8 list-disc text-gray-600">
                  <li>Hai hạng mục: <span className="font-bold">Đội vô địch</span> và <span className="font-bold">Cầu thủ xuất sắc nhất</span> (Quả bóng vàng).</li>
                  <li>Mỗi hạng mục cược <span className="font-bold text-blue-600">50 vcoins</span>, áp dụng cùng luật pool.</li>
                  <li>Có thể thay đổi dự đoán bất cứ lúc nào trước khi admin tính điểm.</li>
                </ul>
              </section>

              {/* Bảng xếp hạng */}
              <section>
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-black">5</span>
                  Bảng xếp hạng
                </h3>
                <ul className="space-y-1.5 pl-8 list-disc text-gray-600">
                  <li>Xem tổng vcoins hoặc lọc theo từng vòng đấu.</li>
                  <li>Các vòng đấu: Vòng bảng · Vòng 32 đội · Vòng 1/8 · Tứ kết · Bán kết · Tranh hạng 3 · Chung kết.</li>
                </ul>
              </section>

              {/* Thời gian */}
              <section className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="font-semibold text-yellow-800 mb-1">⏰ Lịch thi đấu</p>
                <p className="text-yellow-700 text-xs">
                  Giờ hiển thị theo <span className="font-bold">giờ Việt Nam (UTC+7)</span>.
                  Kết quả được cập nhật tự động sau mỗi 15 phút.
                </p>
              </section>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={() => setOpen(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Đã hiểu, bắt đầu chơi!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

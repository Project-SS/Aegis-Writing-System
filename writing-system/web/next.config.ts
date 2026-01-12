import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 배포를 위한 standalone 출력
  output: 'standalone',
  
  // 이미지 최적화 설정
  images: {
    unoptimized: false,
  },
};

export default nextConfig;

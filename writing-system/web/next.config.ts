import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 배포를 위한 standalone 출력
  output: 'standalone',
  
  // 리버스 프록시 환경 설정
  basePath: '',
  assetPrefix: '',
  
  // 이미지 최적화 설정
  images: {
    unoptimized: false,
  },
  
  // 플랫폼 호환성: 0.0.0.0 바인딩
  serverRuntimeConfig: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '3000', 10),
  },
};

export default nextConfig;

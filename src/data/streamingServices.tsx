import React from 'react';
import { Film, Tv, Music, Trophy, Video, Gamepad2, Instagram } from 'lucide-react';
import { SiRoblox } from "react-icons/si";

// --- Tipos Exportados ---

export type CategoryId = 'movies' | 'tv' | 'music' | 'sports' | 'videos' | 'games';

export interface Service {
  name: string;
  url: string; // For System Store, this acts as a fallback or identifier
  iosAppId?: string; // Apple App Store ID
  androidPackageId?: string; // Google Play Package ID
  microsoftStoreId?: string; // Microsoft Store Product ID
  color: string;
  iconLabel?: string; 
  iconContent?: React.ReactNode;
  section?: string; // New: For grouping items (e.g. "Plataformas" vs "Tienda")
  isSystemStore?: boolean; // New: Flags this item to be dynamic based on OS
  webButtonLabel?: string; // Optional custom label for the "Go to web" button in alert
  secondaryUrl?: string; // Optional secondary web link
  secondaryWebLabel?: string; // Label for the secondary web link
}

export interface CategoryData {
  id: CategoryId;
  title: string;
  icon: React.ReactNode;
  services: Service[];
}

// --- Iconos Personalizados ---

const AmazonArrowIcon = () => (
    <svg 
        fill="currentColor" 
        width="100%" 
        height="100%" 
        viewBox="-6 29 60 24" 
        preserveAspectRatio="xMidYMid meet"
    >
        <path d="M47.9943556,35.9463529 L47.9943556,35.9435294 C47.971778,35.4437647 47.8673567,35.0625882 47.658514,34.7463529 L47.6359364,34.7152941 L47.6105366,34.6842353 C47.3988717,34.4527059 47.1956734,34.3651765 46.9755419,34.2691765 C46.3179696,34.0150588 45.3612442,33.8795294 44.2097872,33.8767059 C43.382883,33.8767059 42.4713128,33.9557647 41.5540982,34.1562353 L41.551276,34.0941176 L40.6284171,34.4018824 L40.6114839,34.4103529 L40.0893771,34.5797647 L40.0893771,34.6023529 C39.47696,34.8564706 38.9209869,35.1727059 38.4045245,35.5482353 C38.0827939,35.7882353 37.8175072,36.1072941 37.8033962,36.5957647 C37.7949296,36.8611765 37.9303952,37.1661176 38.1533489,37.3468235 C38.3763025,37.5275294 38.6359448,37.5896471 38.8645429,37.5896471 C38.9181647,37.5896471 38.9689643,37.5868235 39.0141194,37.5783529 L39.0592746,37.5755294 L39.093141,37.5698824 C39.5446928,37.4738824 40.2022651,37.4089412 40.9727253,37.3016471 C41.6331198,37.2282353 42.3330251,37.1745882 42.9397978,37.1745882 C43.368772,37.1717647 43.7554132,37.2028235 44.0206999,37.2592941 C44.1533432,37.2875294 44.2521202,37.3214118 44.3057419,37.3496471 C44.3254973,37.3552941 44.3396083,37.3637647 44.3480749,37.3694118 C44.3593637,37.4061176 44.3762969,37.5021176 44.3734747,37.6348235 C44.3791191,38.1430588 44.164632,39.0861176 43.8683012,40.0065882 C43.5804369,40.9270588 43.2304843,41.8503529 42.999064,42.4630588 C42.94262,42.6042353 42.9059314,42.7595294 42.9059314,42.9289412 C42.900287,43.1745882 43.0018862,43.4738824 43.2163733,43.6715294 C43.425216,43.8691765 43.696147,43.9482353 43.9219229,43.9482353 L43.9332117,43.9482353 C44.2718756,43.9454118 44.5597398,43.8098824 44.8080933,43.6150588 C47.1505182,41.5087059 47.9661336,38.1430588 48,36.2484706 L47.9943556,35.9463529 Z M41.0489247,38.8658824 C40.8090378,38.8630588 40.5635065,38.9195294 40.3349084,39.0268235 C40.0780883,39.1284706 39.8156239,39.2470588 39.5672704,39.3515294 L39.2032068,39.504 L38.7290774,39.6931765 L38.7290774,39.6988235 C33.5785648,41.7882353 28.16841,43.0136471 23.1618295,43.1209412 C22.9783866,43.1265882 22.7921215,43.1265882 22.614323,43.1265882 C14.7403887,43.1322353 8.31706456,39.4785882 1.83729642,35.8785882 C1.61152053,35.76 1.37727804,35.6978824 1.15150215,35.6978824 0.860815683,35.6978824 0.561662624,35.808 0.344353327,36.0112941 C0.12704403,36.2174118 -0.00277710907,36.5138824 4.50895989e-05,36.816 C-0.00277710907,37.2084706 0.208887791,37.5698824 0.505218651,37.8042353 C6.58705678,43.0870588 13.25309,47.9943529 22.2192152,48 C22.3941915,48 22.57199,47.9943529 22.7497885,47.9915294 C28.453452,47.8644706 34.902176,45.936 39.9087564,42.7905882 L39.9398006,42.7708235 C40.5945507,42.3783529 41.2493008,41.9322353 41.8673623,41.4381176 C42.2511813,41.1529412 42.516468,40.7068235 42.516468,40.2437647 C42.4995348,39.4221176 41.8024517,38.8658824 41.0489247,38.8658824 Z" />
    </svg>
);

const TikTokIcon = () => (
    <svg 
        fill="currentColor" 
        viewBox="0 0 24 24" 
        width="100%" 
        height="100%"
    >
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1Z" />
    </svg>
);

const YouTubePlayIcon = () => (
    <svg 
        fill="currentColor" 
        viewBox="0 0 24 24" 
        width="100%" 
        height="100%"
        stroke="currentColor" 
        strokeWidth={2} 
        strokeLinecap="round" 
        strokeLinejoin="round"
    >
        <path d="M6 4l14 8l-14 8z" />
    </svg>
);

// --- Datos de Categorías ---

export const CATEGORIES: CategoryData[] = [
  {
    id: 'movies',
    title: 'Cine y Series',
    icon: <Film className="w-5 h-5 text-white" />,
    services: [
      { name: 'Netflix', url: 'https://www.netflix.com', iosAppId: '363590051', androidPackageId: 'com.netflix.mediaclient', microsoftStoreId: '9WZDNCRFJ3TJ', color: 'bg-[#E50914] text-white', iconLabel: 'N' },
      { name: 'Disney+', url: 'https://www.disneyplus.com', iosAppId: '1446075923', androidPackageId: 'com.disney.disneyplus', microsoftStoreId: '9NXQXXLFST89', color: 'bg-gradient-to-br from-[rgb(4,26,39)] to-[rgba(63,192,203)] text-white', iconLabel: 'D' },
      { name: 'Prime Video', url: 'https://www.primevideo.com', iosAppId: '545519333', androidPackageId: 'com.amazon.avod.thirdpartyclient', microsoftStoreId: '9P6RC76MSMMJ', color: 'bg-[rgba(7,121,255)] text-white', iconContent: <AmazonArrowIcon /> },
      { name: 'HBO Max', url: 'https://www.hbomax.com', iosAppId: '1503927337', androidPackageId: 'com.wbd.stream', color: 'bg-gradient-to-br from-[rgba(144,40,230)] via-[rgba(70,10,196)] to-[rgba(64,119,213)] text-white', iconLabel: 'H' },
      { name: 'Filmin', url: 'https://www.filmin.es', iosAppId: '441405437', androidPackageId: 'com.filmin.filmin', color: 'bg-[rgb(1,220,148)] text-white', iconLabel: 'F' },
      { name: 'SkyShowtime', url: 'https://www.skyshowtime.com', iosAppId: '1635532560', androidPackageId: 'com.skyshowtime.skyshowtime.google', color: 'bg-gradient-to-br from-[rgba(74,48,188)] to-[rgba(190,17,105)] text-white', iconLabel: 'S' },
      { name: 'Movistar+', url: 'https://www.movistarplus.es/', iosAppId: '540674767', androidPackageId: 'es.plus.yomvi', color: 'bg-[rgba(1,155,244)] text-white', iconLabel: 'M+' },
      { name: 'Rakuten TV', url: 'https://rakuten.tv', iosAppId: '515084966', androidPackageId: 'tv.wuaki', color: 'bg-white text-red-600 border border-gray-200 dark:border-transparent', iconLabel: 'R' },
      { name: 'Apple TV+', url: 'https://tv.apple.com', iosAppId: '1174078549', microsoftStoreId: '9NM4T8B9JQZ1', color: 'bg-black text-white', iconLabel: '' },
    ]
  },
  {
    id: 'tv',
    title: 'Televisión',
    icon: <Tv className="w-5 h-5 text-white" />,
    services: [
      { name: 'RTVE Play', url: 'https://www.rtve.es/play/', iosAppId: '454923157', androidPackageId: 'rtve.tablet.android', color: 'bg-[#F46C00] text-white', iconLabel: 'R' },
      { name: 'Atresplayer', url: 'https://www.atresplayer.com/', iosAppId: '561578550', androidPackageId: 'com.a3.player', color: 'bg-[#00995C] text-white', iconLabel: 'A' },
      { name: 'Mediaset Infinity', url: 'https://www.mediasetinfinity.es/', color: 'bg-[linear-gradient(to_bottom_right,rgba(132,32,218,1),rgba(56,92,240,1),rgba(0,155,222,1),rgba(0,228,117,1))] text-white', iconLabel: '∞' },
      { name: 'Movistar+', url: 'https://www.movistarplus.es/', iosAppId: '540674767', androidPackageId: 'es.plus.yomvi', color: 'bg-[rgba(1,155,244)] text-white', iconLabel: 'M+' },
    ]
  },
  {
    id: 'music',
    title: 'Música',
    icon: <Music className="w-5 h-5 text-white" />,
    services: [
      { name: 'Spotify', url: 'https://www.spotify.com', iosAppId: '324684580', androidPackageId: 'com.spotify.music', microsoftStoreId: '9NCBCSZSJRSB', color: 'bg-[#1DB954] text-white', iconLabel: 'S' },
      { name: 'Apple Music', url: 'https://music.apple.com', iosAppId: '1108187390', androidPackageId: 'com.apple.android.music', microsoftStoreId: '9PFHDD62MXS1', color: 'bg-[#FA243C] text-white', iconLabel: 'A' },
      { name: 'Amazon Music', url: 'https://music.amazon.com', iosAppId: '510855668', androidPackageId: 'com.amazon.mp3', microsoftStoreId: '9NMS233VM4Z9', color: 'bg-[rgba(46,215,224)] text-black', iconContent: <AmazonArrowIcon /> },
      { name: 'YouTube Music', url: 'https://music.youtube.com', iosAppId: '1017492454', androidPackageId: 'com.google.android.apps.youtube.music', color: 'bg-[#FF0000] text-white', iconLabel: 'Y' },
      { name: 'Tidal', url: 'https://tidal.com', iosAppId: '913943275', androidPackageId: 'com.aspiro.tidal', microsoftStoreId: '9NNCB5BS59PH',color: 'bg-black text-white', iconLabel: 'T' },
      { name: 'Deezer', url: 'https://www.deezer.com', iosAppId: '292738169', androidPackageId: 'deezer.android.app', microsoftStoreId: '9NBLGGH6J7VV', color: 'bg-[#A238FF] text-white', iconLabel: 'D' },
    ]
  },
  {
    id: 'sports',
    title: 'Deportes en vivo',
    icon: <Trophy className="w-5 h-5 text-white" />, 
    services: [
      { name: 'DAZN', url: 'https://www.dazn.com', iosAppId: '1129523589', androidPackageId: 'com.dazn', color: 'bg-black text-white', iconLabel: 'D' },
      { name: 'Movistar+', url: 'https://www.movistarplus.es/deportes', iosAppId: '540674767', androidPackageId: 'es.plus.yomvi', color: 'bg-[rgba(1,155,244)] text-white', iconLabel: 'M+' },
      { name: 'Orange TV', url: 'https://www.orange.es/tv', color: 'bg-[#FF7900] text-white', iconLabel: 'O' },
      { name: 'ESPN Sports', url: 'https://espndeportes.espn.com/', iosAppId: '317469184', androidPackageId: 'com.espn.score_center', microsoftStoreId: '9NWD3S85MTFB', color: 'bg-white text-red-600 border border-gray-200 dark:border-transparent', iconLabel: 'E' },
    ]
  },
  {
    id: 'videos',
    title: 'Videos',
    icon: <Video className="w-5 h-5 text-white" />,
    services: [
      { 
        name: 'YouTube', 
        url: 'https://www.youtube.com', 
        iosAppId: '544007664',
        androidPackageId: 'com.google.android.youtube',
        color: 'bg-[#FF0000] text-white', 
        iconContent: <div className="w-5 h-5 flex items-center justify-center"><YouTubePlayIcon /></div> 
      },
      { 
        name: 'TikTok', 
        url: 'https://www.tiktok.com', 
        iosAppId: '835599320',
        androidPackageId: 'com.zhiliaoapp.musically',
        microsoftStoreId: '9NH2GPH4JZS4',
        color: 'bg-black text-white', 
        iconContent: <div className="w-5 h-5"><TikTokIcon /></div> 
      },
      { 
        name: 'Instagram', 
        url: 'https://www.instagram.com', 
        iosAppId: '389801252',
        androidPackageId: 'com.instagram.android',
        microsoftStoreId: '9NBLGGH5L9XT',
        color: 'bg-[radial-gradient(circle_at_30%_107%,_#fdf497_0%,_#fdf497_5%,_#fd5949_45%,_#d6249f_60%,_#285AEB_90%)]', 
        iconContent: <Instagram className="w-5 h-5 text-white" /> 
      },
    ]
  },
  {
      id: 'games',
      title: 'Juegos',
      icon: <Gamepad2 className="w-5 h-5 text-white" />,
      services: [
          // Section 1: Platforms
          { 
              name: 'Steam', 
              url: 'https://store.steampowered.com', 
              color: 'bg-[linear-gradient(to_bottom_right,rgba(48,98,156,1),rgba(24,49,104,1))] text-white', 
              iconLabel: 'S',
              section: 'Plataformas'
          },
          { 
              name: 'Xbox', 
              url: 'https://www.xbox.com/play', 
              color: 'bg-[#107C10] text-white', 
              iconLabel: 'X',
              section: 'Plataformas',
              iosAppId: '736179781',
              androidPackageId: 'com.microsoft.xboxone.smartglass',
              microsoftStoreId: '9MV0B5HZVK9Z',
              webButtonLabel: 'Ir a Cloud Gaming web',
              secondaryUrl: 'https://www.xbox.com/es-ES/microsoft-store',
              secondaryWebLabel: 'Ir a la web'
          },
          { 
              name: 'Epic Games', 
              url: 'https://store.epicgames.com', 
              color: 'bg-black text-white', 
              iconLabel: 'E',
              section: 'Plataformas'
          },
          { 
              name: 'Roblox', 
              url: 'https://www.roblox.com', 
              color: 'bg-[rgba(49,86,255,1)]', 
              // @ts-ignore
              iconContent: <SiRoblox className="w-4 h-4 text-white" />,
              section: 'Plataformas',
              iosAppId: '431946152',
              androidPackageId: 'com.roblox.client',
              microsoftStoreId: '9PMF91N3LZ3M'
          },
          { 
              name: 'GeForce Now', 
              url: 'https://www.nvidia.com/geforce-now/', 
              color: 'bg-[#76B900] text-white', 
              iconLabel: 'G',
              section: 'Plataformas',
              androidPackageId: 'com.nvidia.geforcenow'
          },
          // Section 2: System Store (Dynamic)
          {
              name: 'System Store',
              isSystemStore: true,
              url: '#', // Placeholder, resolved at runtime
              color: 'bg-blue-500', // Placeholder
              section: 'Tienda del Sistema'
          }
      ]
  }
];

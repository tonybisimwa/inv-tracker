// Character pool: Naruto + legendary anime (DBZ, One Piece, AoT, Bleach, HxH, MHA, FMA, OPM, etc.)
const CHARACTERS = [
  // Naruto
  'Naruto', 'Sasuke', 'Kakashi', 'Itachi', 'Madara', 'Obito', 'Minato',
  'Jiraiya', 'Tsunade', 'Neji', 'Gaara', 'RockLee', 'Hinata', 'Shikamaru',
  'Temari', 'KillerBee', 'Sai', 'Yamato', 'Nagato', 'Konan',
  // Dragon Ball Z
  'Goku', 'Vegeta', 'Piccolo', 'Gohan', 'Frieza', 'Beerus', 'Broly', 'Bardock', 'Trunks',
  // One Piece
  'Luffy', 'Zoro', 'Sanji', 'Shanks', 'Rayleigh', 'Mihawk', 'Ace', 'Whitebeard',
  // Attack on Titan
  'Levi', 'Eren', 'Mikasa', 'Armin', 'Erwin', 'Hange', 'Reiner',
  // Bleach
  'Ichigo', 'Aizen', 'Rukia', 'Byakuya', 'Kenpachi', 'Yhwach',
  // Hunter x Hunter
  'Killua', 'Gon', 'Hisoka', 'Meruem', 'Kurapika', 'Netero',
  // My Hero Academia
  'Deku', 'Bakugo', 'AllMight', 'Todoroki', 'Endeavor',
  // Fullmetal Alchemist
  'Edward', 'Alphonse', 'Mustang', 'Scar',
  // One Punch Man
  'Saitama', 'Genos', 'Garou', 'BangSilverFang',
  // Other classics
  'Spike', 'Light', 'Ryuk', 'Kirito', 'Meliodas', 'Escanor', 'Ban',
]

export function generateUsername() {
  const name = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]
  const suffix = Math.floor(100 + Math.random() * 900) // 100–999
  return `${name}${suffix}`
}

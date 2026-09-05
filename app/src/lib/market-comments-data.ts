export type CommentSort = "newest" | "oldest" | "most-liked";

export type Comment = {
  user: string;
  ago: string;
  text: string;
  likes: number;
  isHolder?: boolean;
  gif?: string;
};

export type TopHolder = {
  user: string;
  shares: number;
  value: number;
};

export type Position = {
  user: string;
  outcome: string;
  shares: number;
  avgPrice: number;
  currentValue: number;
  pnl: number;
};

export type ActivityItem = {
  user: string;
  action: "bought" | "sold" | "claimed";
  outcome: string;
  shares: number;
  price: number;
  total: number;
  ago: string;
};

export type GifItem = {
  id: string;
  url: string;
  title: string;
  category: string;
  tags: string[];
};

export type GifCategory = {
  id: string;
  label: string;
  preview: string;
};

export type EmojiCategory = {
  id: string;
  label: string;
  emojis: string[];
};

export const emojiCategories: EmojiCategory[] = [
  {
    id: "faces",
    label: "Faces & People",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🫡", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "😮‍💨", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "🥸", "😎", "🤓", "🧐"],
  },
  {
    id: "gestures",
    label: "Gestures & Hands",
    emojis: ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "🫵", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "🫶", "👐", "🤲", "🤝", "🙏", "💪"],
  },
  {
    id: "animals",
    label: "Animals & Nature",
    emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🪱", "🐛", "🦋", "🐌", "🐞", "🐜", "🪲", "🪳", "🦟", "🦗", "🕷️", "🦂", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑"],
  },
  {
    id: "food",
    label: "Food & Drink",
    emojis: ["🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🫛", "🥦", "🥬", "🥒", "🌶️", "🫑", "🌽", "🥕", "🫒", "🧄", "🧅", "🥔", "🍠", "🫘", "🥐", "🍞", "🥖", "🥨", "🧀", "🥚", "🍳", "🧈", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🦴", "🌭", "🍔", "🍟", "🍕", "🫓", "🥪", "🥙", "🧆", "🌮", "🌯", "🫔", "🥗", "🥘", "🫕", "🥫", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🦪", "🍤", "🍙", "🍚", "🍘", "🍥", "🥠", "🥮", "🍢", "🍡", "🍧", "🍨", "🍦", "🥧", "🧁", "🍰", "🎂", "🍮", "🍭", "🍬", "🍫", "🍿", "🍩", "🍪", "🌰", "🥜", "🍯", "🥛", "🍼", "🫖", "☕", "🍵", "🧃", "🥤", "🧋", "🍶", "🍺", "🍻", "🥂", "🍷", "🥃", "🍸", "🍹", "🧉", "🍾"],
  },
  {
    id: "travel",
    label: "Travel & Places",
    emojis: ["🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚛", "🚜", "🏍️", "🛵", "🚲", "🛴", "🛹", "🛼", "🚁", "✈️", "🛩️", "🚀", "🛸", "🚢", "⛵", "🚤", "🛥️", "🏠", "🏡", "🏢", "🏣", "🏤", "🏥", "🏦", "🏨", "🏩", "🏪", "🏫", "🏬", "🏭", "🗼", "🗽", "⛪", "🕌", "🛕", "🕍", "⛩️", "🕋", "⛲", "⛺", "🌁", "🌃", "🏙️", "🌄", "🌅", "🌆", "🌇", "🌉", "🏔️", "⛰️", "🌋", "🗻", "🏕️", "🏖️", "🏜️", "🏝️", "🏞️"],
  },
  {
    id: "objects",
    label: "Objects",
    emojis: ["⌚", "📱", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🖲️", "💾", "💿", "📀", "📼", "📷", "📸", "📹", "🎥", "📽️", "🎞️", "📞", "☎️", "📟", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️", "🧭", "⏱️", "⏲️", "⏰", "🕰️", "💡", "🔦", "🕯️", "💰", "💵", "💴", "💶", "💷", "🪙", "💸", "💳", "🧾", "💹", "📧", "📨", "📩", "📦", "📫", "📪", "📬", "📭", "📮", "🗳️", "✏️", "✒️", "🖋️", "🖊️", "🖌️", "🖍️", "📝", "📁", "📂", "📊", "📈", "📉", "🗓️", "📅", "🗑️", "🔑", "🗝️", "🔒", "🔓", "🔐", "🔑", "💎", "⚖️", "🧲", "🪜", "🔗", "📌", "📍"],
  },
  {
    id: "symbols",
    label: "Symbols",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "⭐", "🌟", "💫", "✨", "🔥", "💥", "❄️", "🌈", "☀️", "🌙", "⚡", "🎉", "🎊", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "✅", "❌", "⭕", "❗", "❓", "💯", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫", "⚪", "🟤", "🔺", "🔻", "💠", "🔶", "🔷", "🔳", "🔲", "🏁", "🚩", "🎌", "🏴", "🏳️", "🏳️‍🌈", "🏳️‍⚧️"],
  },
  {
    id: "crypto",
    label: "Crypto & Finance",
    emojis: ["₿", "Ξ", "🪙", "💰", "💎", "🚀", "📈", "📉", "💳", "🏦", "🪙", "💹", "🪙", "💲", "💳", "🧾", "💹", "📊", "🏦", "🔒", "🔓", "⚡", "🔥", "💎", "🏆", "🎯", "🎲", "🎰", "🃏", "♠️", "♥️", "♦️", "♣️"],
  },
];

export const gifCategories: GifCategory[] = [
  { id: "reactions", label: "Reactions", preview: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif" },
  { id: "celebration", label: "Celebration", preview: "https://media.giphy.com/media/l0MYt5jPR6QRF5aE8/giphy.gif" },
  { id: "trading", label: "Trading", preview: "https://media.giphy.com/media/3o6Zt6ML6BklcajjsA/giphy.gif" },
  { id: "funny", label: "Funny", preview: "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif" },
];

export const gifs: GifItem[] = [
  { id: "g1", url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif", title: "Excited", category: "reactions", tags: ["happy", "excited", "wow"] },
  { id: "g2", url: "https://media.giphy.com/media/l0MYt5jPR6QRF5aE8/giphy.gif", title: "Party", category: "celebration", tags: ["party", "celebrate", "confetti"] },
  { id: "g3", url: "https://media.giphy.com/media/3o6Zt6ML6BklcajjsA/giphy.gif", title: "To the Moon", category: "trading", tags: ["moon", "bullish", "up"] },
  { id: "g4", url: "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif", title: "LOL", category: "funny", tags: ["lol", "funny", "laugh"] },
  { id: "g5", url: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif", title: "Money", category: "trading", tags: ["money", "cash", "rich"] },
  { id: "g6", url: "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif", title: "Cool", category: "reactions", tags: ["cool", "sunglasses", "deal"] },
  { id: "g7", url: "https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif", title: "Thumbs Up", category: "reactions", tags: ["thumbs", "up", "yes", "good"] },
  { id: "g8", url: "https://media.giphy.com/media/3o7aCTfyhYawMw0BVu/giphy.gif", title: "Rocket", category: "trading", tags: ["rocket", "moon", "launch", "up"] },
  { id: "g9", url: "https://media.giphy.com/media/l4FGI2HnlKMvUPlLi/giphy.gif", title: "Cash", category: "trading", tags: ["cash", "money", "dollars"] },
  { id: "g10", url: "https://media.giphy.com/media/VbnUQpnihPSIgIXuZv/giphy.gif", title: "Nice", category: "reactions", tags: ["nice", "good", "well done"] },
  { id: "g11", url: "https://media.giphy.com/media/11sBLVzNsCv6WA/giphy.gif", title: "Rekt", category: "funny", tags: ["rekt", "loss", "down", "crash"] },
  { id: "g12", url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif", title: "Thinking", category: "reactions", tags: ["think", "hmm", "wonder"] },
];

export function gifUrl(path: string) {
  return encodeURI(path);
}

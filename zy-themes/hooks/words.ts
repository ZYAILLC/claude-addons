// The words the Themes pane and the theme button show, in English (the default) and Simplified Chinese.

export type Lang = 'en' | 'zh'

export type Words = {
  /** The toggle shows the other language, in that language. */
  toggle: string
  open: string
  reset: string
  now: string
  noTheme: string
  builtIn: string
  yourPictures: string
  animated: string
  dialogPrompt: string
  noDialog: (command: string) => string
  applied: (title: string) => string
  cleared: string
  unshown: (reason: string) => string
}

export const WORDS: Record<Lang, Words> = {
  en: {
    toggle: '中文',
    open: '📂 Open image…',
    reset: '↺ Reset',
    now: 'Now:',
    noTheme: 'no theme',
    builtIn: 'Built-in',
    yourPictures: 'Your pictures',
    animated: 'animated',
    dialogPrompt: 'Choose a picture for the backdrop',
    noDialog: command => `This system has no Open window here. Use /${command} image <path>.`,
    applied: title => `${title} is now the backdrop.`,
    cleared: 'Back to the original look.',
    unshown: reason =>
      `This window does not draw themes (${reason}); the Claude desktop and mobile apps do. Your choice is saved.`,
  },
  zh: {
    toggle: 'English',
    open: '📂 打开图片…',
    reset: '↺ 重置',
    now: '当前：',
    noTheme: '无主题',
    builtIn: '内置',
    yourPictures: '我的图片',
    animated: '动画',
    dialogPrompt: '选择一张图片作为背景',
    noDialog: command => `这里无法打开选择文件窗口，请用 /${command} image <路径>。`,
    applied: title => `已换成「${title}」。`,
    cleared: '已恢复原样。',
    unshown: reason => `这个窗口不显示主题（${reason}）；Claude 桌面和手机应用会显示。你的选择已保存。`,
  },
}

/** Each built-in theme's name and line in Chinese; English lives with the theme itself. */
export const THEMES_ZH: Record<string, { title: string; blurb: string }> = {
  sakura: { title: '樱花晨曦', blurb: '粉色晨光里，樱花枝垂在薄雾湖面上。' },
  inkwash: { title: '水墨山水', blurb: '宣纸上的水墨远山，云雾缭绕，夕阳微暖。' },
  petals: { title: '花瓣微风', blurb: '春日山坡上一棵樱花树，花瓣随风飘落。动画。' },
  moonlit: { title: '月下湖光', blurb: '一轮满月映照静谧的山间湖泊。' },
  fireflies: { title: '萤火森林', blurb: '月光洒进林间空地，萤火虫轻轻飞舞。动画。' },
  starlit: { title: '星海', blurb: '银河横跨平静的海面，繁星闪烁，偶有流星划过。动画。' },
}

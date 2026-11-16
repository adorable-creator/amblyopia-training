# 小瞳力视觉训练

当前版本：v5。

## v5 修复

- 修复全屏后点击球体/星星不计分、误扣分的问题。
- 修复全屏后球体和星星被拉伸的问题。
- 修复退出全屏后需要暂停并重新开始才能恢复的问题。
- 全屏进入/退出时会自动重新计算 Canvas 尺寸并重置当前回合目标。
- 点击坐标会按 Canvas 当前显示尺寸换算到内部绘制坐标。

## 运行

```bash
npm install
npm start
```

如 Electron 下载超时，可使用：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install
```

## 检查语法

```bash
npm run check:syntax
```

## 打包 Windows

```bash
npm run pack:win
```

## 医疗提示

本软件仅作为家庭辅助训练工具，不能替代眼科医生或视光师的诊断与治疗方案。遮盖、配镜、红蓝镜、训练时长和训练频率请遵医嘱执行。

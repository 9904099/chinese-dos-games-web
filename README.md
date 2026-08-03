# chinese-dos-games-web

这是 [`rwv/chinese-dos-games-web`](https://github.com/rwv/chinese-dos-games-web) 的移动端增强 fork，游戏数据来自 [`9904099/chinese-dos-games`](https://github.com/9904099/chinese-dos-games)。

## 移动端控制

- 可触控虚拟手柄：方向键、A/B/X/Y、开始、选择。
- 完整虚拟键盘：功能键、数字、字母、修饰键和方向键。
- 虚拟触控板：相对移动、左键和右键。
- 自定义手柄映射：每个虚拟手柄按键都可映射到 DOS 键位，配置保存在浏览器 `localStorage`。
- 防卡键：页面失焦、切换控制面板或应用进入后台时自动释放仍按下的键。

手机进入游戏后，先点“启动/聚焦游戏”，再选择手柄、鼠标或键盘。部分游戏需要连续按两次“开始”越过标题画面。

## Usage

### 下载 Flask

``` sh
$ pip3 install flask
```

### 下载游戏文件

在根目录下执行
``` sh
$ git submodule update --init --recursive --remote && python3 ./static/games/download_data.py
```

### 运行 Flask

在根目录下执行

``` sh
$ python3 app.py
```

## 测试

需要 Node.js 22：

```sh
npm ci
npm test
```

浏览器 E2E 需要一个运行在本地的候选服务，并通过 `DOSGAME_BASE_URL` 指定地址：

```sh
DOSGAME_BASE_URL=http://127.0.0.1:19262 npm run test:e2e
```

## Docker 候选镜像

`Dockerfile` 在固定摘要的原始 2019 镜像之上覆盖公开前端源码，不自动跟随 `latest`：

```sh
docker build -t chinese-dos-games-web:mobile .
docker run --rm -p 127.0.0.1:19262:262 chinese-dos-games-web:mobile
```

游戏文件及其版权边界继承上游项目；公开源码与固定基础镜像摘要之间仍不构成基础镜像的可复现构建证明。

## Credits

* [dreamlayers/em-dosbox: An Emscripten port of DOSBox](https://github.com/dreamlayers/em-dosbox)
* [db48x/emularity: easily embed emulators](https://github.com/db48x/emularity)

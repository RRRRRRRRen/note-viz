import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { CodeAnnotate } from "@/components/demo/CodeAnnotate";
import { StepThrough } from "@/components/demo/StepThrough";
import { Exercise } from "@/components/demo/Exercise";
import {
  Callout,
  CrossRef,
  DoDont,
  MemoryCard,
  SequenceDiagram,
  SpecQuote,
} from "@/components/viz";
import { ShellBlock } from "@/components/demo/ShellBlock";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        整份配置只有两个 location 在干活，分工一句话：
        <strong>
          location / 把 URL 映射到磁盘上的 dist（静态托管），location /admin-api/
          把接口请求转发给后端容器（反向代理）
        </strong>
        。其中 <code>try_files $uri $uri/ /index.html</code> 是 SPA 的生命线——history
        路由的地址在磁盘上并不存在，全部靠它兜底回 index.html，交给前端路由接手。 proxy_pass
        的末尾斜杠决定转发时保不保留路径前缀，差一个字符就 404。页面与接口同域之后，
        <strong>浏览器眼里不存在跨域</strong>，配置里那段 CORS 响应头实际是无人消费的冗余代码。
      </Conclusion>

      <Heading level={2} title="全貌：骨架、两个 location、一份逐行批注" />
      <Paragraph>
        nginx.conf 的骨架是固定的三层：worker
        进程设置、events（连接模型）、http（真正的业务配置都在这， 其中的 server
        块代表一个虚拟主机）。一份生产在用的前端配置全文不长，逐行看：
      </Paragraph>

      <CodeAnnotate
        code={`worker_processes  1;

events {
    worker_connections  1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile      on;
    keepalive_timeout  65;
    client_max_body_size 300m;

    server {
        listen       80;

        location / {
            root   /home/cnsig/cnsig-ems-ui;
            try_files $uri $uri/ /index.html;
            index  index.html index.htm;
        }

        location /admin-api/ {
            proxy_set_header Host $http_host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "Upgrade";
            proxy_pass http://cnsig-ems-boot:21080/admin-api/;
        }

        error_page   500 502 503 504  /50x.html;
        location = /50x.html {
            root   html;
        }
    }
}`}
        lang="javascript"
        annotations={[
          {
            line: 1,
            text: "worker 进程数。容器里配 1：静态托管 + 反代单进程足够；设 auto 让 nginx 按 CPU 数自定也可以。",
            color: "#9ca3af",
          },
          {
            line: 8,
            text: "引入 mime 类型表——js/css 的 Content-Type 全靠它。官方镜像自带这份文件（你的清单只覆盖了主配置，没动它）。",
            color: "#9ca3af",
          },
          {
            line: 12,
            text: "请求体上限 300MB：文件上传接口的守门员。超过即返回 413 Request Entity Too Large——「大文件传不上去」先查这行。",
            color: "#f59e0b",
          },
          {
            line: 15,
            text: "容器内监听 80。用户访问的端口是 docker run -p / K8s Service 映射出来的，跟这个数字是两回事。",
            color: "#9ca3af",
          },
          {
            line: 18,
            text: "URL → 磁盘的映射基准：请求 /assets/a.js 到这里找 /home/cnsig/cnsig-ems-ui/assets/a.js。必须与 Dockerfile 的 COPY 目标一致（暗约定）。",
            color: "#1677ff",
          },
          {
            line: 19,
            text: "SPA 生命线：按顺序找 $uri 文件 → $uri/ 目录 → 都没有就内部重定向到 /index.html，前端路由接手。",
            color: "#f59e0b",
          },
          {
            line: 23,
            text: "前缀匹配：所有以 /admin-api/ 开头的请求离开静态托管，进入反向代理。",
            color: "#8b5cf6",
          },
          {
            line: 27,
            text: "以 HTTP/1.1 与后端通信——WebSocket 升级头（下两行）要求 1.1，nginx 默认用 1.0 会握手失败。",
            color: "#f59e0b",
          },
          {
            line: 30,
            text: "转发目的地。末尾带 /admin-api/（带 URI）：location 匹配到的前缀原样保留，后端收到的路径与浏览器发出的一致。",
            color: "#8b5cf6",
          },
          {
            line: 33,
            text: "服务端错误（含 502：后端挂了）统一渲染 nginx 默认的 50x.html。看到这张页面的含义是「nginx 活着，但它身后死了」。",
            color: "#f85149",
          },
        ]}
      />

      <Heading level={2} title="location /：静态托管与 history 路由回退" />
      <Paragraph>
        静态托管的核心是 <code>root</code>——它定义了「URL 路径 → 磁盘路径」的拼接基准：请求{" "}
        <code>/assets/index.js</code>，nginx 去 <code>root/assets/index.js</code>{" "}
        找文件。真正的难点在 <code>try_files</code>，官方定义是：
      </Paragraph>
      <SpecQuote source="nginx docs · ngx_http_core_module — try_files">
        Checks the existence of files in the specified order and uses the first found file for
        request processing. If none of the files were found, an internal redirect to the uri
        specified in the last parameter is made.
      </SpecQuote>
      <Paragraph>
        对照 <code>try_files $uri $uri/ /index.html</code>：先找 <code>$uri</code>
        对应的文件，再找它对应的目录，都找不到就<strong>内部重定向</strong>到 /index.html
        ——浏览器完全无感，拿到的永远是一份能跑的前端入口。为什么要这么兜底？因为 history
        模式的路由地址（/login、/order/detail）<strong>磁盘上并不存在对应文件</strong>
        ，它们只是前端路由表里的记录；没有这条兜底，用户刷新 /login 就是一张
        404。用三个真实请求推演一遍：
      </Paragraph>

      <StepThrough
        label="try_files 命中推演 / fallback walkthrough"
        height={200}
        steps={[
          {
            title: "GET /assets/index-3fa2.js",
            desc: "$uri 命中真实文件 → 直接返回 js 内容（Content-Type 由 mime.types 决定）。静态资源走的是第一优先级。",
            color: "#3fb950",
          },
          {
            title: "GET /login（history 路由刷新）",
            desc: "磁盘上没有 login 文件也没有 login 目录 → 兜底生效，内部重定向 /index.html → 返回 HTML → 前端路由接管，渲染登录页。地址栏不变。",
            color: "#f59e0b",
          },
          {
            title: "GET /images/missing.png（资源真丢了）",
            desc: "同样落进兜底 → 返回的是 index.html 的内容、状态 200。注意：真正缺失的静态资源也会拿到 HTML——这就是「图片请求返回了网页」这类怪象的来源。",
            color: "#f85149",
          },
        ]}
      />

      <Heading level={2} title="location /admin-api/：反向代理与斜杠语义" />
      <Paragraph>
        反向代理的行为由 <code>proxy_pass</code> 一行决定，而它有<strong>带 URI 与不带 URI</strong>{" "}
        两种语义，官方规则：
      </Paragraph>
      <SpecQuote source="nginx docs · ngx_http_proxy_module — proxy_pass">
        If the proxy_pass directive is specified with a URI, then when a request is passed to the
        server, the part of a normalized request URI matching the location is replaced by a URI
        specified in the directive.
      </SpecQuote>
      <Paragraph>
        套用到本配置：location 是 <code>/admin-api/</code>，proxy_pass 写的是{" "}
        <code>http://cnsig-ems-boot:21080/admin-api/</code>（带了 URI）——location 匹配到的前缀
        /admin-api/ 被替换为 /admin-api/，等于<strong>原样保留</strong>
        ，后端收到的路径和浏览器发出的 完全一致。如果末尾只写到端口，则是另一种语义，对照：
      </Paragraph>
      <ShellBlock>{`# 浏览器请求：GET /admin-api/user

location /admin-api/ {
  proxy_pass http://cnsig-ems-boot:21080/admin-api/;
}   → 后端收到 /admin-api/user   （前缀保留，前缀换前缀）

location /admin-api/ {
  proxy_pass http://cnsig-ems-boot:21080;
}   → 后端收到 /admin-api/user   （不带 URI，原样透传）

location /admin-api/ {
  proxy_pass http://cnsig-ems-boot:21080/;
}   → 后端收到 /user             （前缀被剥掉！）`}</ShellBlock>
      <Paragraph>
        差一个斜杠，后端收到的路径就少一段——「接口 404 但 nginx
        日志里请求明明存在」的经典根因。本配置还带了 四组 <code>proxy_set_header</code>：
        <code>Host</code> 让后端知道原始域名；<code>X-Real-IP</code> 与 <code>X-Forwarded-For</code>{" "}
        传递真实客户端 IP（否则后端眼里所有请求都来自 nginx 这一个地址）；
        <code>Upgrade / Connection</code> 是 WebSocket 握手所需——HTTP/1.1
        的连接升级是逐跳头（hop-by-hop），代理默认不转发，必须显式带上，前端的长连接才能穿过反代。
      </Paragraph>

      <SequenceDiagram
        label="一次接口请求的完整旅程 / proxy flow"
        actors={["浏览器", "nginx 容器", "后端 cnsig-ems-boot"]}
        messages={[
          { from: 0, to: 1, label: "GET /admin-api/user（同源请求）" },
          { from: 1, to: 1, label: "前缀匹配 location /admin-api/", dashed: true },
          {
            from: 1,
            to: 2,
            label: "GET /admin-api/user（附 Host / X-Forwarded-For）",
            color: "#8b5cf6",
          },
          { from: 2, to: 1, label: "200 JSON", dashed: true },
          { from: 1, to: 0, label: "200 JSON（原样回传）", dashed: true },
        ]}
      />

      <Heading level={2} title="同域之后，CORS 头是冗余的" />
      <Paragraph>
        配置原文里 location / 还带了一段 CORS 响应头（Access-Control-Allow-Origin
        等）。理解它为什么冗余，只需要回到 CORS 的执行者：
        <strong>同源策略与 CORS 检查都发生在浏览器</strong>
        。本部署里页面来自 nginx、接口也发往同一个
        nginx（路径前缀不同不影响源），协议、域名、端口三元组完全一致 ——这是
        <strong>同源请求</strong>，浏览器根本不会发起 CORS
        检查，那些响应头没有任何消费者。它们只有在
        「页面与接口真跨域、浏览器直连后端」的架构里才有意义。保留它无害但误导读者，规范的做法是删除或注明来历
        ——通常它是从某个「跨域演示配置」模板里抄来的遗迹。
      </Paragraph>

      <MemoryCard
        keyword="location / 管静态，/admin-api/ 管转发，try_files 兜底 SPA"
        color="#8b5cf6"
      >
        <p>
          root 是 URL→磁盘的拼接基准（必须与 COPY 目标一致）；
          <code>try_files $uri $uri/ /index.html</code> 让 history 路由刷新不
          404，但也让「缺失的资源」拿到 HTML（排查时先看响应类型）。proxy_pass
          末尾斜杠决定前缀去留：带 URI = 替换前缀，不带 = 原样透传。同域部署下 CORS
          头无消费者——跨域从来不是被解决了，是被反代绕开了。
        </p>
      </MemoryCard>

      <Heading level={2} title="边界与陷阱" />
      <Paragraph>
        三个高频坑：一个在转发路径上，一个在兜底逻辑的副作用里，一个在请求体限制上。
      </Paragraph>

      <Heading level={3} title="坑 1：proxy_pass 末尾多写一个斜杠，接口前缀被剥" />
      <DoDont
        label="坑 1 · 斜杠语义 / trailing slash"
        dont={{
          code: `location /admin-api/ {
  proxy_pass http://boot:21080/;   # 末尾带了 /
}
# 浏览器：GET /admin-api/user
# 后端收到：GET /user  → 404
# nginx 日志里却看得到这条请求`,
          note: "带 URI（哪怕只有一个 /）就触发「前缀替换」：/admin-api/ 被换成 /，前缀没了。后端路由表里根本没有 /user，只能 404。",
        }}
        do={{
          code: `location /admin-api/ {
  proxy_pass http://boot:21080/admin-api/;
}
# 后端收到 /admin-api/user，与前端约定一致
# 或干脆不带 URI：proxy_pass http://boot:21080;`,
          note: "验证方法很简单：在后端或 tcp 层看真实收到的路径；改斜杠前后对比一次，这条规则就再也不用背了。",
        }}
      />

      <Heading level={3} title="坑 2：缺失的资源不报 404，返回了一份 HTML" />
      <DoDont
        label="坑 2 · 兜底的副作用 / everything is index.html"
        dont={{
          code: `// 前端代码：
fetch('/api/data')        // 命中 location / （没配反代）
//  ← 返回 200，body 是 index.html！
img.src = '/images/logo.png'  // 资源没打进 dist
//  ← 200，body 还是 index.html，图片解析失败`,
          note: "try_files 把「找不到」全部变成「返回首页」，404 从此绝迹——问题被藏起来了。SPA 架构下「状态 200 但内容不对」是常态，排查必须看响应类型与内容。",
        }}
        do={{
          code: `# 排查口诀：先看响应是什么，再看状态码
$ curl -sI https://site.corp.com/api/data
Content-Type: text/html     ← 拿到的是网页不是接口！
# 说明请求落进了 location / 的兜底：
# 检查反代 location 是否存在、前缀是否写对`,
          note: "SPA 的 404 长着 200 的脸。凡是「接口/资源返回了网页」，第一嫌疑就是请求没进预期的 location。",
        }}
      />

      <Heading level={3} title="坑 3：上传接口报 413，后端毫无感知" />
      <DoDont
        label="坑 3 · 请求体上限 / client_max_body_size"
        dont={{
          code: `# 用户上传 500MB 视频文件
# 请求根本没到后端——nginx 直接拒了：
HTTP/1.1 413 Request Entity Too Large
# 后端日志：一片安静`,
          note: "nginx 默认请求体上限只有 1MB，本配置放宽到 300m。超过上限的请求在代理层就被拒绝，后端不会有任何日志——「后端说没收到请求」时的第一嫌疑人。",
        }}
        do={{
          code: `http {
  client_max_body_size 300m;   # 按业务上限留余量
}
# 配置是 COPY 进镜像的，改它 = 改源文件
# → 重新 build → push → 更新容器（不能 exec 里改完就算）`,
          note: "记住这条配置在镜像里：改它要走一次完整构建。另外 K8s 入口若还有一层 ingress，两层都要放行，任何一层拒了都是 413。",
        }}
      />

      <Callout kind="info" title="改配置的正确姿势">
        这份 nginx.conf 是被 Dockerfile <code>COPY</code> 进镜像的——在容器里 <code>vi</code>{" "}
        改它只影响那一个容器实例，重建即蒸发。正确路径永远是：改仓库里的 conf 源文件 → 重新构建镜像
        → 更新容器。想快速验证一段配置语法，用{" "}
        <code>docker run --rm -v 配置:/etc/nginx/nginx.conf nginx nginx -t</code>
        （把本地配置挂载进一次性容器做语法检查），不会污染任何现有容器。
      </Callout>

      <Heading level={2} title="动手练习" />
      <Exercise
        tags={["反代", "前缀约定"]}
        hint="前缀出现在三个地方：前端请求地址、location、proxy_pass——必须一起动。"
        question={
          <>
            后端团队决定接口前缀从 <code>/admin-api/</code> 改为 <code>/api/</code>
            （后端路由本身不变，仍接受 /admin-api/ 开头）。前端与 nginx.conf 各需要改什么？
          </>
        }
        answer={
          <Paragraph>
            前端改环境变量 <code>VITE_GLOB_API_URL=/api</code> 并重新构建；nginx.conf 把{" "}
            <code>location /admin-api/</code> 改为 <code>location /api/</code>，proxy_pass
            写法二选一：<code>proxy_pass http://cnsig-ems-boot:21080/admin-api/;</code>
            （带 URI，把 /api/ 前缀替换回后端认的 /admin-api/——正适合"后端路由不变"的场景）。注意
            proxy_pass 的替换逻辑在这里从「原样保留」变成了「改写前缀」，改完用 curl
            核对后端实际收到的路径。
          </Paragraph>
        }
      />
      <Exercise
        tags={["WebSocket", "location"]}
        hint="握手请求也是一个 HTTP 请求——它会被哪个 location 接住？"
        question={
          <>
            前端要连 <code>wss://site.corp.com/ws</code> 长连接（后端 21080 端口提供 /ws
            服务），当前配置下会发生什么？补上缺失的配置。
          </>
        }
        answer={
          <Paragraph>
            当前配置没有 location /ws，握手请求（GET /ws + Upgrade 头）落进 location /
            的兜底，返回的是 index.html——WebSocket 握手失败，前端报连接错误。需要新增：
            <code>
              location /ws{" "}
              {
                '{ proxy_pass http://cnsig-ems-boot:21080/ws; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "Upgrade"; }'
              }
            </code>
            ——升级头虽然全局有了，但逐跳头必须在该 location 的代理层显式存在，缺一握手必失败。
          </Paragraph>
        }
      />

      <Heading level={2} title="追问链" />
      <QAChain
        intro="五问沿一次请求的路径，从回退逻辑问到配置的批判性阅读。"
        items={[
          {
            q: "用户在 /login 页面按下 F5 刷新，nginx 返回的是什么？磁盘上有 login 这个文件吗？",
            intent:
              "热身题：history 路由回退是前端容器化部署的第一常识，也是 try_files 存在的唯一理由。",
            a: "磁盘上没有 login 文件。nginx 按 try_files 顺序检查 $uri（login，不存在）、$uri/（login/ 目录，不存在），最后内部重定向到 /index.html——返回的是首页的 HTML，浏览器加载完整前端后由 vue-router/react-router 接管，渲染出登录页。地址栏里的 /login 从头到尾只是前端路由的记号，从未对应过一个真实文件。",
            bonus:
              "hash 模式（/#/login）不需要这条兜底——# 后的部分不发给服务器，服务器永远只见到 /。",
            depth: 1,
          },
          {
            q: "这份配置下，浏览器请求 /admin-api/user 属于跨域吗？CORS 检查发生在哪一层？",
            intent:
              "检验同源判定的三元组与 CORS 的执行者——「配置了 CORS 头所以不跨域」是把因果说反了的说法。",
            a: "不属于。同源判定看协议、域名、端口三元组：页面来自 nginx 的 80 端口，接口也发往同一个 nginx 的 80 端口，前缀 /admin-api 只是路径——三元组完全一致，是同源请求，浏览器不会发起 CORS 检查。真正改变源的「跨域请求」根本没发生：跨到后端的那一跳是 nginx 在服务端完成的，同源策略管不到服务器之间的通信。配置里那段 CORS 响应头在同域部署下没有任何消费者，是冗余的。",
            bonus:
              "反推也成立：如果接口地址写成了 http://api.corp.com（另一个源），浏览器直连后端，此时后端必须配 CORS——反代方案正是为了把这个场景彻底消灭。",
            depth: 2,
          },
          {
            q: "location /admin-api/ 下，proxy_pass 写 http://boot:21080 与 http://boot:21080/ 有什么区别？请求 /admin-api/user 分别转发成什么？",
            intent: "核心考点：proxy_pass 的 URI 替换规则。这题答对，斜杠问题终身免疫。",
            a: "不带 URI（写到端口为止）：请求 URI 原样透传，后端收到 /admin-api/user。带 URI（哪怕只有一个 /）：location 匹配到的前缀 /admin-api/ 被替换成指令里的 URI——写 / 就替换成 /，后端收到 /user，前缀被剥掉。所以「带不带斜杠」的本质是「带不带 URI」，差一个字符就是两种转发语义。",
            bonus:
              "写 /admin-api（结尾无斜杠）替换后等于把前缀改成 /admin-api，视觉上与原样透传一样——但语义已变，后端路径约定变了时要特别小心。",
            depth: 3,
          },
          {
            q: "为什么普通 HTTP 接口不用配 Upgrade/Connection 头，WebSocket 就必须配？",
            intent:
              "进阶题：理解 hop-by-hop 头与连接升级机制——这是「长连接穿过反代必断」问题的通用解释。",
            a: "WebSocket 复用 HTTP 握手：客户端发一个带 Upgrade: websocket 的 GET，要求把这条连接从「一问一答」升级为「持久双向」。而 Connection/Upgrade 属于 hop-by-hop 头——语义只作用于当前这一跳，代理默认不转发它们。nginx 不转发，握手就到不了后端。所以反代配置必须显式 proxy_set_header Upgrade 与 Connection，并升级到 HTTP/1.1（nginx 默认用 1.0 与后端通信，1.0 没有升级机制）。",
            bonus:
              "生产上还要注意代理层与后端之间的读超时：长连接空闲期间没有数据，proxy_read_timeout 到期会掐断连接，做法是调大超时或让业务层发心跳。",
            depth: 4,
          },
          {
            q: "用批判的眼光重读这份配置：哪些行其实可以删或值得商榷？",
            intent:
              "压轴题：从「会读」上升到「会评」——能指出模板配置里的历史遗迹，才算真正理解每一行的存在理由。",
            a: "至少三处。① CORS 响应头整段冗余（同域部署无消费者），应删或注明来历；② server_name localhost（原文里还有这一行，未入上文节选）在容器里意义有限——匹配靠的是 location 与端口，这个值只在多虚拟主机时才起作用；③ worker_processes 1 是保守值，CPU 有富余时写 auto 更合理。反过来 error_page 的 50x 页面、client_max_body_size 都是有真实职能的行——批评的前提是逐行问过「它在防什么事故」。",
            bonus:
              "可改进而不仅是可删的：静态资源若由构建期压缩（VITE_COMPRESS）或 nginx gzip 提供，还应补上强缓存策略（assets/ 带 hash 可长缓存），这是这类模板配置普遍缺失的一块。",
            depth: 5,
          },
        ]}
      />

      <Heading level={2} title="下一步去哪" />
      <Paragraph>
        配置文件通了，接下来看让这一切跑起来的两个脚本化环节：<strong>部署脚本 deploy.sh</strong>{" "}
        每一步在做什么（以及它和 CI 通道的关系），和<strong>容器跑起来之后的排查</strong>
        ——502、容器起不来、页面 404 的三条排查路径。
      </Paragraph>
      <CrossRef
        notes={[
          {
            title: "5 行的 Dockerfile 是怎么变成镜像的？",
            to: "/note/devtools/docker/dockerfile/build-anatomy",
            description: "前置：root 与 COPY 目标的暗约定——本篇 location / 的前置条件。",
          },
          {
            title: "部署脚本 deploy.sh 每一步在做什么？",
            to: "/note/devtools/docker/deploy/deploy-script-anatomy",
            description: "系列下一篇：把这份配置装进镜像并推上仓库的脚本逐段精读。",
          },
        ]}
      />
    </NoteShell>
  );
}

/** nginx 配置/命令类代码块：站内 CodeBlock 仅支持 JS/TS 高亮，此类内容用此本地块呈现 */

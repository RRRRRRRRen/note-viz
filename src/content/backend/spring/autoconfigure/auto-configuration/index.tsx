import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import CodeBlock from "@/components/demo/CodeBlock";
import { FlowChart } from "@/components/demo/FlowChart";
import { CompareTable, DoDont, MemoryCard, Timeline, VizBlock } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        自动配置解决的是两件事：<strong>重复</strong>（每个新项目重写几十个 Bean）和
        <strong>遗忘</strong>（漏注册关键 Bean，启动不报错、运行时才踩坑）。 starter jar 一进
        classpath，默认 Bean 就自动就位——先给一套合理默认值，需要改时才动手。 生效要
        <strong>两个条件缺一不可</strong>：类上贴 <code>@AutoConfiguration</code>
        、类名登记在 <code>AutoConfiguration.imports</code>；装配靠
        <strong>类型契约</strong>——框架启动时按类型捞 Bean，返回类型才是契约，方法名无关；
        覆盖第三方默认值优先用 <code>before</code> 抢注，让对方的
        <code>@ConditionalOnMissingBean</code> 自动让位。
      </Conclusion>

      <Heading level={2} title="它解决什么问题：重复与遗忘" />
      <Paragraph>
        业务系统要集成一堆能力：数据库、缓存、Web、安全、定时任务、消息队列……每个能力都对应若干个
        Bean（<code>RedisTemplate</code>、<code>MybatisPlusInterceptor</code>
        、全局异常处理器……），一个中型项目几十个起步。没有自动配置的话，每开一个新项目就得在启动类里
        <code>@Import</code> 几十个配置类，于是产生两个真实痛点：
        <strong>重复</strong>——每个项目把 Bean 声明抄一遍，A 项目改了 B 项目忘改；
        <strong>遗忘</strong>——漏注册某个不起眼但关键的 Bean。
      </Paragraph>
      <Paragraph>
        遗忘尤其恶心，它是最难排查的一类 bug：<strong>启动不报错，运行时才踩坑</strong>
        。比如漏了 <code>MetaObjectHandler</code>（自动填充 createTime/updateTime
        的钩子），程序照常启动照常运行，直到某天发现数据库里所有记录的创建时间都是 null
        ——出错点离根因很远，排查成本极高。自动配置正是冲着这两个痛点来的。
      </Paragraph>
      <Paragraph>
        把 Spring 容器想象成一套房子：手动配置是<strong>毛坯房</strong>
        ——空房间交付，水电、空调、窗帘全自己张罗，每个新项目重新装修一遍；自动配置是
        <strong>精装修房</strong>——交付即可入住，默认家具已经就位，只有不合心意时才动手换。
      </Paragraph>

      <CompareTable
        label="类比 / housing"
        left={{
          title: "毛坯房 = 手动配置",
          color: "#f59e0b",
          points: [
            "交付时空空如也：Bean 全靠自己逐个声明",
            "每个新项目重复装修一遍，复制粘贴成灾",
            "漏装一件家具（Bean）不会报错，住进去才发现",
          ],
        }}
        right={{
          title: "精装修 = 自动配置",
          color: "#3fb950",
          points: [
            "交付即可入住：starter 进 classpath，默认 Bean 自动就位",
            "只有不合心意才动手：@ConditionalOnMissingBean 用户优先",
            "水电动线已预设：框架预留的扩展点被自动填上",
          ],
        }}
      />
      <Paragraph>
        注意一个关键认知：自动配置<strong>不是替代你配置</strong>
        ，而是「先给你一套合理的默认值，你只在需要改的时候才动手」——这就是 Spring Boot
        约定优于配置的核心思想。后面所有机制（imports 清单、类型契约、条件装配）都围绕这一句话展开。
      </Paragraph>

      <MemoryCard keyword="两个条件，缺一不可" color="#1677ff">
        一个自动配置类要生效，必须同时满足：<strong>① 类上贴 @AutoConfiguration</strong>
        （本质是 @Configuration 的派生，附带 before/after 排序语义）+{" "}
        <strong>② 类名登记在 AutoConfiguration.imports</strong>
        文件。Spring 不会遍历 jar 里的所有类（太慢），只读 imports
        名单——少了登记，这个类根本不会被加载。
      </MemoryCard>

      <Heading level={2} title="发现机制：一个文件，一条独立通道" />
      <Paragraph>
        每个 starter 都在自己的 jar 里放一份清单：{" "}
        <code>
          META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
        </code>
        ，一行一个全限定类名，<code>#</code> 开头是注释。Spring Boot
        官方自带的自动配置类（一百多个）也是用同一份清单登记的。
      </Paragraph>
      <Paragraph>
        它是一条<strong>独立通道</strong>，和 <code>@ComponentScan</code>{" "}
        没有任何关系。证据很直接：主启动类的扫描路径通常只覆盖业务包（如{" "}
        <code>com.acme.server</code>），而 starter 的类在 <code>com.acme.framework</code>
        之类的包下——根本扫不到，却照样生效。反过来说明：自动配置的发现走的是 imports
        文件，不是包扫描。starter 也因此可以「加依赖即生效」，业务方完全不用动主启动类。
      </Paragraph>

      <PlainCode
        label="清单 / AutoConfiguration.imports"
        color="#f59e0b"
        code={`# 位置：META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
com.acme.redis.config.AcmeRedisAutoConfiguration
com.acme.redis.config.AcmeCacheAutoConfiguration
com.acme.web.config.AcmeWebAutoConfiguration
# ↑ 一行一个全限定类名，# 开头是注释，空行忽略`}
      />
      <Paragraph>
        从启动到 Bean 就位的完整调用链长这样——发现（读清单）只是第一步，排序和条件过滤在注册前完成：
      </Paragraph>

      <FlowChart
        label="调用链 / discovery"
        height={440}
        data={{
          direction: "TB",
          nodes: [
            { id: "app", label: "@SpringBootApplication 启动", color: "#1677ff" },
            { id: "enable", label: "@EnableAutoConfiguration", color: "#1677ff" },
            { id: "selector", label: "AutoConfigurationImportSelector", color: "#8b5cf6" },
            { id: "scan", label: "ClassLoader.getResources 遍历 classpath", color: "#f59e0b" },
            { id: "collect", label: "收集候选类（starter + 官方清单）", color: "#f59e0b" },
            { id: "sort", label: "AutoConfigurationSorter 拓扑排序", color: "#8b5cf6" },
            { id: "filter", label: "@ConditionalOnXxx 条件过滤", color: "#f59e0b" },
            { id: "register", label: "注册为配置类 → 解析 @Bean", color: "#3fb950" },
          ],
          edges: [
            { source: "app", target: "enable" },
            { source: "enable", target: "selector" },
            { source: "selector", target: "scan" },
            { source: "scan", target: "collect" },
            { source: "collect", target: "sort", label: "发现完成" },
            { source: "sort", target: "filter", label: "注册顺序已定" },
            { source: "filter", target: "register", label: "幸存者" },
          ],
        }}
      />
      <Paragraph>
        「遍历整个 classpath」靠的是 <code>ClassLoader.getResources()</code>
        ：按清单文件的路径，把 classpath 上所有 jar
        里同名文件的资源枚举出来，不区分本项目还是第三方。所以引入的每个 starter
        都会被自动清点，无需任何显式注册。
      </Paragraph>
      <Paragraph>
        还有一个常见误解要纠正：<strong>Spring Boot 3 并没有完全弃用 spring.factories</strong>
        。只是自动配置这一项（EnableAutoConfiguration key）搬到了 imports 文件；其它 SPI 扩展点仍在
        spring.factories 里。典型例子是 <code>EnvironmentPostProcessor</code>
        ：它在启动<strong>最早期</strong>（环境准备阶段）执行，比如根据数据库 URL
        推断数据库类型、写入配置项——这个时机早于自动配置阶段，imports
        文件根本装不下它。一句话分工：自动配置类走
        imports；早期扩展点（EnvironmentPostProcessor、ApplicationListener 等）留在
        spring.factories。
      </Paragraph>

      <Heading level={2} title="生效原理：约定的是类型，不是名字" />
      <Paragraph>
        容易产生一个误解：「类上贴了 <code>@AutoConfiguration</code>，jar 引进来 Bean
        就自动注册了」。错。这个注解本身只是 <code>@Configuration</code> 的派生，多了 before/after
        排序能力，它不会让 Spring 主动来找你——Spring 只读 imports 清单里列出的名字。所以自动配置类 =
        贴注解 + 登记，两条腿走路，缺一条腿都不行。
      </Paragraph>
      <Paragraph>
        更关键的问题是：Bean 注册进容器之后，<strong>它自己并不会干活</strong>。
        <code>MetaObjectHandler</code> 凭什么在插入数据时自动填字段？
        <code>MybatisPlusInterceptor</code> 凭什么改写分页
        SQL？核心原理一句话：自动配置只负责「按框架约定的类型注册 Bean」，框架启动时向容器
        <strong>按类型</strong>要
        Bean——谁实现了约定的接口就用谁——然后把它装配进自己的引擎；运行期框架执行到自己的执行点，就回调这个装配好的
        Bean。
      </Paragraph>

      <Timeline
        label="从注册到生效 / lifecycle"
        steps={[
          { label: "注册契约 Bean", sub: "返回类型 = 扩展点", color: "#f59e0b" },
          { label: "框架按类型发现", sub: "谁实现接口就用谁", color: "#1677ff" },
          { label: "装配进引擎", sub: "挂到 SqlSessionFactory 等", color: "#8b5cf6" },
          { label: "运行期回调", sub: "框架执行到点就调", color: "#3fb950" },
        ]}
      />
      <Paragraph>
        这里有个最容易踩的认知坑：<strong>约定的是类型，不是名字</strong>
        。@Bean 方法的返回类型才是给容器看的契约——方法名叫什么无所谓；但如果声明类型写成了
        Object，框架按具体类型做「未实例化 Bean 的类型预测」时就会漏掉它（细节见追问链第 4 问）。
      </Paragraph>
      <Paragraph>
        按生效方式分三类：① <strong>框架钩子</strong>——框架在自己的执行点回调（MetaObjectHandler
        填字段、分页插件改写 SQL）；② <strong>AOP 切面</strong>——Bean
        本身是切面，拦截你的业务方法（如幂等注解切面）；③ <strong>被动注入</strong>
        ——框架不管它，等你的代码 @Resource
        注入后自己调（RedisTemplate、RestTemplate）。自动配置不保证每个注册的 Bean
        都被消费——注册了但没人用的就是「孤儿 Bean」，白占内存不干活。
      </Paragraph>

      <DoDont
        label="类型契约 / by type"
        dont={{
          code: `@Bean
public Object myInterceptor() {
  return new MybatisPlusInterceptor();
}
// 实际返回类型没问题……`,
          note: "声明类型是 Object：未实例化的 Bean 按方法签名预测类型，框架按 MybatisPlusInterceptor 捞不到它",
        }}
        do={{
          code: `@Bean
public MybatisPlusInterceptor myAwesomeInterceptor() {
  return new MybatisPlusInterceptor();
}
// 方法名随便起`,
          note: "返回类型才是契约——只要声明类型正确，按类型查找照样命中",
        }}
      />

      <Heading level={2} title="排序与条件装配：先排队，再淘汰" />
      <Paragraph>
        发现（读清单）之后、注册之前，还有两件事：<strong>排序</strong>和<strong>条件过滤</strong>
        。先说排序——
        <code>before</code>/<code>after</code> 表面上是「顺序」，本质是{" "}
        <strong>Bean 定义的注册顺序</strong>。Spring 先把所有候选类按依赖关系做拓扑排序（构成一张
        DAG，成环则启动失败），再按序逐个处理。为什么必须排序？因为条件判断只能看到「已经注册的定义」：A
        类里写 <code>@ConditionalOnMissingBean</code> 想让位给 B，如果 B 还没注册，A 就会误判「没有
        B」而错误地创建自己的默认实现。
      </Paragraph>

      <FlowChart
        label="排序 DAG / order"
        height={300}
        data={{
          direction: "LR",
          nodes: [
            { id: "acmeRedis", label: "AcmeRedisAutoConfiguration", color: "#1677ff" },
            { id: "idempotent", label: "AcmeIdempotentAutoConfiguration", color: "#f59e0b" },
            { id: "redisson", label: "RedissonAutoConfigurationV2（官方）", color: "#8b5cf6" },
            { id: "acmeMybatis", label: "AcmeMybatisAutoConfiguration", color: "#1677ff" },
            {
              id: "mybatisPlus",
              label: "MybatisPlusAutoConfiguration（官方）",
              color: "#8b5cf6",
            },
          ],
          edges: [
            { source: "acmeRedis", target: "idempotent", label: "after（要用 Redis）" },
            { source: "acmeRedis", target: "redisson", label: "before（抢注）" },
            { source: "acmeMybatis", target: "mybatisPlus", label: "before（先注册）" },
          ],
        }}
      />
      <Paragraph>
        再说条件过滤——<code>@ConditionalOnXxx</code> 系列决定「这个 Bean 到底建不建」，常用的四个：
      </Paragraph>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>
          <code>@ConditionalOnClass</code>：classpath 上有某类才装配——适合
          <strong>可选依赖</strong>
          （没引入 Lock4j 就整个跳过，不报错）；
        </li>
        <li>
          <code>@ConditionalOnMissingBean</code>：容器里没有此类型才装配——适合
          <strong>默认值</strong>，用户定义了就用用户的；
        </li>
        <li>
          <code>@ConditionalOnBean</code>：容器里有某 Bean 才装配——适合
          <strong>依赖前置设施</strong>（有 Redis 才建防重 DAO）；
        </li>
        <li>
          <code>@ConditionalOnProperty</code>：配置项为某值才装配——功能开关，常配{" "}
          <code>matchIfMissing = true</code>：配置里<strong>没写</strong>
          也当满足，即「默认开启，设 enable=false 才关闭」。
        </li>
      </ul>
      <Paragraph>
        其中 <code>@ConditionalOnMissingBean</code>{" "}
        是整个体系的灵魂，它承载了「用户优先」语义：业务方注册了自己的 <code>XssCleaner</code>
        ，starter 里的默认实现（JsoupXssCleaner）就自动失效。注意它判断的是
        <strong>类型，不是 Bean 名字</strong>——用户的 Bean 叫 <code>myXssCleaner</code>{" "}
        也照样让位；反过来，用户的实现若没实现该接口，默认实现不会让位，会出现两个实现并存的隐患。
      </Paragraph>

      <MemoryCard keyword="用户优先 = 注册顺序 + 条件判断" color="#3fb950">
        自动配置类被统一排在用户配置<strong>之后</strong>处理，所以它们的 @ConditionalOnMissingBean
        评估时用户 Bean 定义已在容器里——「用户定义了就用用户的，否则用默认的」。
        同理，自动配置类之间的 before/after 也直接决定谁的条件判断能看到谁。
      </MemoryCard>
      <DoDont
        label="覆盖第三方默认值 / override"
        dont={{
          code: `@AutoConfiguration(after = RedissonAutoConfigurationV2.class)
public class AcmeRedisAutoConfiguration {
  @Bean
  public RedisTemplate<String, Object> redisTemplate(
      RedisConnectionFactory factory) { ... }
}`,
          note: "排在后面再注册同名 Bean：Boot 3 默认禁止 Bean 定义覆盖，启动直接 BeanDefinitionOverrideException",
        }}
        do={{
          code: `@AutoConfiguration(before = RedissonAutoConfigurationV2.class)
public class AcmeRedisAutoConfiguration {
  @Bean
  public RedisTemplate<String, Object> redisTemplate(
      RedisConnectionFactory factory) { ... } // JSON 序列化
}`,
          note: "抢先注册：官方默认配置的 @ConditionalOnMissingBean 看到已有就让位——替换而非冲突",
        }}
      />

      <Heading level={2} title="深度案例：starter 的两个样板间" />
      <Heading level={3} title="样板间一：MyBatis starter——before 抢注扩展点" />
      <Paragraph>
        一个真实感很强的自定义 starter 通常同时用到本篇所有机制。看这个精简版 MyBatis starter
        的自动配置类，注意四个设计点：
      </Paragraph>

      <CodeBlock
        lang="typescript"
        code={`@AutoConfiguration(before = MybatisPlusAutoConfiguration.class) // ① 抢在官方配置前注册
@MapperScan(value = "\${acme.info.base-package}",               // ② 包路径来自配置项，不写死
        annotationClass = Mapper.class)
public class AcmeMybatisAutoConfiguration {

    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor()); // 分页插件
        return interceptor;
    }

    @Bean
    public MetaObjectHandler metaObjectHandler() {
        return new AuditingFieldHandler(); // insert/update 前自动填 createTime 等
    }

    @Bean
    @ConditionalOnProperty(prefix = "mybatis-plus.global-config.db-config",
            name = "id-type", havingValue = "INPUT") // ③ 只有序列型数据库才需要
    public IKeyGenerator keyGenerator(Environment env) {
        DbType dbType = resolveDbType(env); // ④ 由 EnvironmentPostProcessor 启动早期推断
        return switch (dbType) {
            case POSTGRE_SQL -> new PostgreKeyGenerator();
            case KINGBASE_ES -> new KingbaseKeyGenerator(); // 人大金仓
            case DM           -> new DmKeyGenerator();      // 达梦
            default -> throw new IllegalArgumentException("暂不支持: " + dbType);
        };
    }
}`}
      />
      <Paragraph>
        ① <strong>before 的意义</strong>
        ：MyBatis-Plus 官方自动配置也有一套 Mapper 扫描的兜底逻辑；starter 抢先注册自己基于配置项的{" "}
        <code>@MapperScan</code>，把 Mapper 的管理权收到自己手里，同时避免兜底逻辑扫错包时打警告。②{" "}
        <strong>包路径用占位符</strong>：写死包名的 starter
        换个项目就废；从配置项读，任何项目引入后配一行就能用。③ <strong>条件注册</strong>
        ：MySQL 项目用雪花算法生成主键（id-type 是 ASSIGN_ID），根本不需要
        IKeyGenerator——条件不满足，这个 Bean 压根不会被创建，不污染容器。④{" "}
        <strong>多数据库适配</strong>
        ：数据库类型在环境准备阶段由 spring.factories 里的 EnvironmentPostProcessor
        推断（还记得上一节的分工吗？），这里只是它的下游消费者。
      </Paragraph>
      <Paragraph>
        装配完成后业务代码得到什么？Mapper
        自动扫描、分页开箱即用、审计字段自动填充、多数据库主键适配——全部
        <strong>零感知</strong>。这就是精装修：住户（业务代码）从来不用关心水电走线（Bean 装配）。
      </Paragraph>

      <Heading level={3} title="样板间二：Redis starter——抢在默认实现前面" />
      <CodeBlock
        lang="typescript"
        code={`@AutoConfiguration(before = RedissonAutoConfigurationV2.class) // 抢在 Redisson 前注册
public class AcmeRedisAutoConfiguration {

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);
        template.setKeySerializer(RedisSerializer.string()); // KEY 可读
        template.setValueSerializer(buildRedisSerializer()); // VALUE 走 JSON
        template.setHashKeySerializer(RedisSerializer.string());
        template.setHashValueSerializer(buildRedisSerializer());
        return template;
    }

    static RedisSerializer<?> buildRedisSerializer() {
        RedisSerializer<Object> json = RedisSerializer.json();
        ObjectMapper mapper = (ObjectMapper) ReflectUtil.getFieldValue(json, "mapper");
        mapper.registerModules(new JavaTimeModule()); // 解决 LocalDateTime 序列化
        return json;
    }
}`}
      />
      <Paragraph>
        为什么非得 <code>before</code>？官方/Redisson 的默认配置会注册 JDK 序列化的
        RedisTemplate——写进 Redis 的值是 <code>\xac\xed</code> 开头的二进制，redis-cli
        里没法直接看，跨语言也没法消费。这个 starter 想要 JSON 序列化版本，正确姿势就是
        <strong>抢先注册</strong>，让默认配置的 @ConditionalOnMissingBean 判断「已有
        redisTemplate」而跳过——全程只有一份定义，无冲突、无覆盖。「第三方默认值不合意时，用 before
        抢注而不是事后覆盖」是自定义 starter 的通用套路，Redis、MyBatis、WebSocket 类 starter
        里反复出现。
      </Paragraph>

      <Heading level={2} title="边界与陷阱" />
      <Paragraph>
        <strong>陷阱一：孤儿 Bean。</strong>
        自动配置只负责「按约定放进去」，不保证有用。一个 Bean
        注册进容器后，如果没有任何框架按类型消费它、你的代码也没注入它，它就是孤儿——占内存、不干活。排查「某个功能为什么没生效」时，先确认
        Bean 存不存在，再找「谁应该消费它」：钩子类 Bean 没被框架装配、切面 Bean
        没生效，往往不是没注册，而是注册的时机或类型不对。
      </Paragraph>
      <Paragraph>
        <strong>陷阱二：别把框架钩子当成 AOP。</strong>
        MetaObjectHandler 在插入前填字段、分页插件在执行时改写
        SQL，看起来都像「操作前自动执行逻辑」，很容易答成「Spring AOP
        做的」。两者层次不同：框架钩子拦的是<strong>框架自己的执行过程</strong>
        ，由框架按类型装配后在内部调用；AOP 拦的是<strong>你写的业务方法</strong>
        ，由动态代理在方法前后插入逻辑。面试里混淆这两者，等于暴露没理解装配机制。
      </Paragraph>

      <CompareTable
        label="对比 / hook vs aop"
        left={{
          title: "框架钩子",
          color: "#f59e0b",
          points: [
            "拦「框架自己的执行过程」（SQL 执行、insert 之前）",
            "框架启动时按类型发现并装配，在内部回调",
            "例：MetaObjectHandler 填字段、分页插件改写 SQL",
            "不是 Spring AOP，没有代理与切点",
          ],
        }}
        right={{
          title: "AOP 切面",
          color: "#8b5cf6",
          points: [
            "拦「你写的业务方法」（按切点表达式匹配）",
            "Spring 动态代理在方法前后插入逻辑",
            "例：幂等切面拦截标了 @Idempotent 的方法",
            "才是真正意义上的 AOP",
          ],
        }}
      />
      <Paragraph>
        <strong>陷阱三：注册文件写错位置，且毫无报错。</strong>
        把自动配置类按老习惯写进 spring.factories 的 EnableAutoConfiguration key——Spring Boot 3
        已经不读这个 key 了，结果是<strong>静默失效</strong>
        ：不报错、不生效，启动日志一切正常。这是升级 Boot 3
        时最阴的坑，因为「没生效」往往要到运行时才被发现（正是本文开头说的那类最难排查的 bug）。
      </Paragraph>
      <Paragraph>
        <strong>陷阱四：在 starter 里用 @Component。</strong>
        starter jar 里的组件标 @Component 依赖包扫描——而扫描路径写死在<strong>别人项目</strong>
        的主启动类包下，装进别的项目就静默失效；同时也丧失了被 @ConditionalOnMissingBean
        覆盖的能力。starter 内的组件一律在自动配置类里 @Bean 注册。
      </Paragraph>

      <DoDont
        label="Boot 3 注册位置 / registry"
        dont={{
          code: `# spring.factories（Boot 3 中已失效的写法）
org.springframework.boot.autoconfigure.EnableAutoConfiguration=\\
  com.acme.redis.AcmeRedisAutoConfiguration`,
          note: "Boot 3 不再从这个 key 读自动配置：不报错、不生效，静默失败最危险",
        }}
        do={{
          code: `# AutoConfiguration.imports（Boot 3 唯一正确位置）
com.acme.redis.AcmeRedisAutoConfiguration

# EnvironmentPostProcessor 等早期扩展点 → 仍写 spring.factories`,
          note: "自动配置走 imports；早期扩展点才是 spring.factories 的地盘",
        }}
      />
      <DoDont
        label="starter 组件注册 / registration"
        dont={{
          code: `@Component  // 在 starter jar 里
public class AcmeSigninAspect { ... }`,
          note: "依赖别人的 @ComponentScan 扫到自己的包——装进别的项目就失效，且不可条件化、不可覆盖",
        }}
        do={{
          code: `@AutoConfiguration
public class AcmeSigninAutoConfiguration {
  @Bean
  public AcmeSigninAspect acmeSigninAspect(StringRedisTemplate redis) {
    return new AcmeSigninAspect(redis);
  }
}`,
          note: "在 @AutoConfiguration 里 @Bean 注册：不依赖扫描、可加条件、用户可整体覆盖",
        }}
      />

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "starter 加个依赖就生效，Spring 是怎么找到里面的配置类的？",
            intent:
              "热身题，筛掉只会背「约定优于配置」六个字的人——看你说不说得出 imports 清单这条独立通道。",
            depth: 2,
            a: "靠每个 starter 自带的 META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports 文件。启动时 AutoConfigurationImportSelector 用 ClassLoader.getResources 遍历整个 classpath 上所有同名文件（不区分本项目还是第三方 jar），把一行一个的全限定类名收集起来，经排序和条件过滤后注册为配置类。它和 @ComponentScan 完全无关——starter 的类通常在主应用扫描路径之外却照样生效，反证走的是独立通道。",
            bonus:
              "启动加 --debug 参数或访问 /actuator/conditions，能看到每个自动配置类的匹配与排除报告，排查「为什么没生效」永远从这查起。",
          },
          {
            q: "@ConditionalOnMissingBean 的「用户定义了就用用户的」，靠什么保证判断时用户的 Bean 已经存在？",
            intent:
              "考察两类配置的加载时机差异——答不出 DeferredImportSelector，说明对生效原理只停留在注解表面。",
            depth: 3,
            a: "靠加载时机差。自动配置由 AutoConfigurationImportSelector 处理，它是个 DeferredImportSelector——用户的所有 @Configuration 先解析注册完，才轮到自动配置阶段收集与注册。所以自动配置类里的 @ConditionalOnMissingBean 评估时，用户 Bean 定义已在容器中，默认实现自动让位。同理，自动配置类之间的 before/after 也会直接改变 @ConditionalOnBean / @ConditionalOnMissingBean 的判断结果——它看的是「已注册的定义」，不是最终实例。",
            bonus:
              "延伸结论：在普通（非自动配置）的 @Configuration 里用 @ConditionalOnMissingBean 并不可靠，官方文档明确警告它依赖处理顺序——这也是「默认值请写在自动配置类里」的原因。",
          },
          {
            q: "把 before = RedissonAutoConfigurationV2 改成 after，启动会发生什么？",
            intent:
              "一条注解改动的推演题，检验 before/after、同名 Bean、条件注解三者有没有在你脑子里串成体系。",
            depth: 3,
            a: "大概率启动直接报 BeanDefinitionOverrideException——Spring Boot 3 默认 spring.main.allow-bean-definition-overriding=false，同名 Bean 定义冲突是硬错误。即使手动放开覆盖允许启动，也只是「看似正常」：官方默认实现可能已被它自己的初始化流程引用，事后覆盖的行为是割裂的。正确做法不是事后覆盖，而是 before 抢注——让对方的 @ConditionalOnMissingBean 判断「已有」而跳过，从源头保证只有一份定义。",
            bonus:
              "补一个运维视角：官方默认 RedisTemplate 是 JDK 序列化，值在 Redis 里是二进制乱码、redis-cli 无法直读；JSON 序列化版本对排查和跨语言消费都友好——这正是值得抢注的原因。",
          },
          {
            q: "@Bean 方法声明返回类型是 Object、实际 return 一个 MybatisPlusInterceptor，框架按类型还能注入到它吗？",
            intent:
              "很多人背了「按类型装配」，却不知道类型是怎么算出来的——这题专门筛掉背口诀的人，考 Bean 类型解析机制。",
            depth: 4,
            a: "不一定——取决于注入发生在 Bean 实例化之前还是之后。单例未创建时，Spring 按工厂方法的返回值签名「预测」Bean 类型，声明 Object 就被预测成 Object，按类型查找命中不了；单例一旦实例化，类型判断改用实例的实际类型，就能命中。而 MyBatis-Plus 官方配置是在启动早期创建 SqlSessionFactory 并收集 Interceptor 的，那时你的 Bean 大概率还没实例化——所以实践中「声明 Object」通常真的失效。结论：@Bean 的返回类型就是给容器看的契约，永远声明具体类型。",
            bonus:
              "源码入口：DefaultListableBeanFactory.getBeanNamesForType → getTypeForFactoryMethod（按签名预测），实例化后走 isTypeMatch（按实际类型）——两条路径的差异就是这题的答案。",
          },
          {
            q: "排序和条件过滤谁先谁后？容器里还没有任何实例时，@ConditionalOnBean 凭什么做判断？",
            intent: "压轴题，把发现→排序→过滤→注册全链路串起来问，任何一环没吃透都会露馅。",
            depth: 5,
            a: "先排序，后过滤。AutoConfigurationSorter 先按 @AutoConfigureOrder / before / after 对候选类做拓扑排序（成环则启动失败），之后按序处理排好序的类：第一阶段先用 @ConditionalOnClass 做廉价过滤（只查 classpath，不需要容器）；幸存的类作为配置定义按序进入注册阶段，@ConditionalOnBean / @ConditionalOnMissingBean 在这个阶段评估，看的是 BeanDefinition 注册表——「排在我前面的类注册的定义」可见，「排在我后面的」不可见。这正是排序必须显式声明的根本原因：条件判断的正确性依赖注册顺序。",
            bonus:
              "所有条件评估结果都会记录进 ConditionEvaluationReport，/actuator/conditions 读的就是它——报告会标明每个类被哪条条件放行或排除，是排查装配问题的权威依据。",
          },
        ]}
      />

      <Heading level={2} title="写在最后" />
      <Paragraph>
        回到精装修的类比收个尾：Spring Boot 把「水电走线、家具摆位」（Bean
        装配）做成标准交付，住户只在换家具时出手。而这套「框架预留扩展点 +
        按契约装配」的思想并不只属于 Spring——React 里你声明
        UI、由协调器决定何时以及如何更新（站内「协调与 Diff」）；Node 流里你只管写、背压由 pipeline
        自动传导（站内「backpressure 背压」）。同一个母题反复出现：
        <strong>把「什么时候做」交给框架，你只声明「做什么」</strong>
        。理解了一处，处处相通。
      </Paragraph>
    </NoteShell>
  );
}

function PlainCode(props: { label: string; code: string; color?: string }) {
  return (
    <VizBlock label={props.label} {...(props.color !== undefined ? { color: props.color } : {})}>
      <pre className="overflow-x-auto rounded-lg bg-[#0d1117] p-4 font-mono text-xs leading-relaxed text-[#e6edf3]">
        {props.code}
      </pre>
    </VizBlock>
  );
}

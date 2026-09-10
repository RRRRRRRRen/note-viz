/** 图片块：显式宽高防 CLS、lazy 加载、居中题注。图片统一放 public/images/<tech>/，src 写 "/images/..." */
export function Figure(props: {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}) {
  return (
    <figure className="my-5">
      <img
        src={props.src}
        alt={props.alt}
        {...(props.width !== undefined ? { width: props.width } : {})}
        {...(props.height !== undefined ? { height: props.height } : {})}
        loading="lazy"
        className="mx-auto rounded-lg border border-border"
      />
      {props.caption && (
        <figcaption className="mt-2 text-center text-xs leading-relaxed text-muted">
          {props.caption}
        </figcaption>
      )}
    </figure>
  );
}

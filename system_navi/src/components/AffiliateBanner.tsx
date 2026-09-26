
import links from '@site/src/data/affiliate-links';
import "@site/src/css/affiliate.css";

type MoshimoButton = {
  s_n: string;
  u_url: string;
  a_id: number;
  p_id: number;
  pc_id: number;
  pl_id: number;
};

function moshimoUrl(btn: MoshimoButton): string {
  return `https://af.moshimo.com/af/c/click?a_id=${btn.a_id}&p_id=${btn.p_id}&pc_id=${btn.pc_id}&pl_id=${btn.pl_id}&url=${encodeURIComponent(btn.u_url)}`;
}

export default function AffiliateBanner({ site }: { site: string }) {
  const html = links[site];
  if (!html) return <p>リンクが見つかりません: {site}</p>;

  const match = html.match(/msmaflink\((\{[\s\S]*?\})\)/);
  if (!match) return <p>msmaflink データが見つかりません: {site}</p>;

  const m = JSON.parse(match[1]);
  const title     = m.n;
  const image     = m.d + m.c_p + m.p[0];
  const urlAmazon  = moshimoUrl(m.b_l.find((b: MoshimoButton) => b.s_n === 'amazon'));
  const urlRakuten = moshimoUrl(m.b_l.find((b: MoshimoButton) => b.s_n === 'rakuten'));
  const urlYahoo   = moshimoUrl(m.b_l.find((b: MoshimoButton) => b.s_n === 'yahoo'));

  return (
    <div className="affiliate-card">
      <div className="af-box">
        <div className="af-imgbox">
          <img src={image} alt={title} />
        </div>
        <div className="af-info">
          <div className="af-title">
            <a href={urlAmazon} rel="nofollow" target="_blank">{title}</a>
          </div>
          <div className="af-kobox">
            <div className="amazon">
              <a href={urlAmazon} rel="nofollow" target="_blank">amazon</a>
            </div>
            <div className="rakuten">
              <a href={urlRakuten} rel="nofollow" target="_blank">楽天</a>
            </div>
            <div className="yahoo">
              <a href={urlYahoo} rel="nofollow" target="_blank">Yahoo</a>
            </div>
          </div>
        </div>
        <div className="clear"></div>
      </div>
    </div>
  );
}

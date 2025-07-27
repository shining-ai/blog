
import links from '@site/src/data/affiliate-links.json';
import "@site/src/css/affiliate.css";

export default function AffiliateBanner({ site }) {
  const link = links[site];
  if (!link) return <p>リンクが見つかりません: {site}</p>;

  return (
    <div className="affiliate-card">
      <div className="af-box">
        <div className="af-imgbox">
          <img
            src={link.image}
            alt={link.title}
          />
        </div>
        <div className="af-info">
          <div className="af-title">
            <a href={link.urlAmazon} rel="nofollow" target="_blank">{link.title}</a>
          </div>
          <div className="af-kobox">
            <div className="amazon">
              <a href={link.urlAmazon} rel="nofollow" target="_blank">amazon</a>
            </div>
            <div className="rakuten">
              <a href={link.urlRakuten} rel="nofollow" target="_blank">楽天</a>
            </div>
            <div className="yahoo">
              <a href={link.urlYahoo} rel="nofollow" target="_blank">Yahoo</a>
            </div>
          </div>
        </div>
        <div className="clear"></div>
      </div>
    </div>
  );
}
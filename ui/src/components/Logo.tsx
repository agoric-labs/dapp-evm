type LogoProps = {
  width?: string;
  height?: string;
};

const Logo = ({ width = '250px', height = '250px' }: LogoProps) => (
  <div className="logo-container">
    <a href="https://agoric.com/develop" target="_blank">
      <img
        src={`${import.meta.env.BASE_URL}agoric.svg`}
        className="agoric-logo"
        alt="Agoric logo"
        height={height}
        width={width}
      />
    </a>
  </div>
);

export default Logo;

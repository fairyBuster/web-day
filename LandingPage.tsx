import { useCallback } from "react";

export const LandingPage = (): JSX.Element => {
  const handleLogin = useCallback(() => {
    window.dispatchEvent(new CustomEvent("landingpage:login"));
  }, []);

  const handleRegister = useCallback(() => {
    window.dispatchEvent(new CustomEvent("landingpage:register"));
  }, []);

  return (
    <main
      className="flex min-h-[917px] min-w-[412px] w-full overflow-hidden bg-[url(https://c.animaapp.com/Hkn97w75/img/landing-page@3x.png)] bg-cover bg-[50%_50%]"
      data-model-id="5:72"
      aria-labelledby="landing-page-title"
    >
      <section
        className="relative mt-[568px] flex h-[349.3px] w-[412px] flex-col items-start overflow-hidden rounded-[18px_18px_0px_0px] bg-white shadow-[0px_6px_20px_#00000014]"
        aria-describedby="landing-page-description"
      >
        <div className="relative flex w-full flex-[0_0_auto] flex-col items-start gap-[9.3px] px-6 pb-6 pt-7">
          <header className="relative flex w-full flex-[0_0_auto] flex-col items-center px-0 pb-px pt-0">
            <h1
              id="landing-page-title"
              className="relative mt-[-1px] flex w-fit items-center justify-center whitespace-nowrap text-center font-['Ubuntu',Helvetica] text-[22px] font-medium leading-[normal] tracking-[0] text-[#1c1c1e]"
            >
              Selamat Datang
            </h1>
          </header>
          <div className="relative flex w-full flex-[0_0_auto] flex-col items-center px-0 pb-[18.7px] pt-0">
            <p
              id="landing-page-description"
              className="relative mt-[-1px] flex w-[228px] items-center justify-center text-center font-['Ubuntu',Helvetica] text-[13px] font-normal leading-[20.8px] tracking-[0] text-[#9aa0a6]"
            >
              Akses akun Anda dengan aman atau daftar untuk mulai menggunakan
              layanan kami.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogin}
            className="all-unset box-border relative flex w-full flex-[0_0_auto] cursor-pointer items-center justify-center rounded-[14px] bg-[#0d1b4c] p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d1b4c]"
          >
            <span className="relative mt-[-1px] flex w-fit items-center justify-center whitespace-nowrap text-center font-['Ubuntu',Helvetica] text-[15px] font-medium leading-[normal] tracking-[0] text-white">
              Masuk
            </span>
          </button>
          <button
            type="button"
            onClick={handleRegister}
            className="all-unset box-border relative flex w-full flex-[0_0_auto] cursor-pointer items-center justify-center rounded-[14px] border border-solid border-[#e2e4e8] bg-white px-4 pb-4 pt-[18.7px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d1b4c]"
          >
            <span className="relative flex w-fit items-center justify-center whitespace-nowrap text-center font-['Ubuntu',Helvetica] text-[15px] font-medium leading-[normal] tracking-[0] text-[#1c1c1e]">
              Daftar Akun Baru
            </span>
          </button>
          <footer className="relative flex w-full flex-[0_0_auto] flex-col items-center px-0 pb-0 pt-[10.7px]">
            <p className="relative mt-[-1px] w-fit text-center font-['Ubuntu',Helvetica] text-xs font-normal leading-[19.2px] tracking-[0] text-transparent">
              <span className="text-[#9aa0a6]">
                Dengan melanjutkan, Anda menyetujui{" "}
              </span>
              <span className="font-medium text-[#e0342c]">
                Syarat &amp;
                <br />
                Ketentuan
              </span>
              <span className="text-[#9aa0a6]"> yang berlaku.</span>
            </p>
          </footer>
        </div>
      </section>
    </main>
  );
};

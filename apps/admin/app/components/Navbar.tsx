interface NavbarProps {
  title: string;
}

export function Navbar({ title }: NavbarProps) {
  return (
    <div className="flex flex-row items-center border-b border-gray-200 bg-white px-4 pt-4 pb-4">
      <div className="w-[30px]" />
      <h1 className="flex-1 text-center text-[17px] font-bold text-gray-900">{title}</h1>
      <div className="w-[30px]" />
    </div>
  );
}

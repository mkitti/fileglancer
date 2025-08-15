import { Button, Input } from '@material-tailwind/react';
import { HiChevronRight } from 'react-icons/hi';

import useNavigationInput from '@/hooks/useNavigationInput';
import toast from 'react-hot-toast';

export default function NavigationInput() {
  const { inputValue, handleInputChange, handleNavigationInputSubmit } =
    useNavigationInput();

  return (
    <form
      onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const result = handleNavigationInputSubmit();
        if (!result.success) {
          toast.error(result.error);
        }
      }}
      className="col-span-2 flex w-1/2 pr-3 items-center justify-center gap-2"
    >
      <Input
        value={inputValue}
        onChange={handleInputChange}
        type="text"
        placeholder="/path/to/file"
      />
      <Button type="submit" className="max-h-full flex-1 gap-1">
        Go
        <HiChevronRight className="icon-small stroke-2" />
      </Button>
    </form>
  );
}

import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useDb } from '../../store/db';
import { useCurrentUser } from '../../store/session';
import { Button, EmptyState, PageHeader } from '../../components/ui';
import { FoodCard } from '../../components/food';

export default function Favourites() {
  const user = useCurrentUser()!;
  const nav = useNavigate();
  const ids = useDb((s) => s.favourites[user.id] ?? []);
  const items = useDb((s) => s.items);
  const list = ids.map((id) => items[id]).filter(Boolean);
  return (
    <div className="container-app page-x">
      <PageHeader title="My Favourites" subtitle="Your go-to campus cravings." back />
      {list.length ? (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
          {list.map((i) => <FoodCard key={i.id} item={i} width="w-full" />)}
        </div>
      ) : (
        <EmptyState art={<Heart className="h-14 w-14" strokeWidth={1.6} />} title="No favourites yet!" description="Tap the heart on any meal to save it here." action={<Button full onClick={() => nav('/explore')}>Discover Food</Button>} />
      )}
    </div>
  );
}

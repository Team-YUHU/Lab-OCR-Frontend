import { Suspense } from 'react';
import { InventoryView } from '@/features/inventory/components/inventory-view';

export default function InventoryPage() {
	// The view reads ?q= from the URL, which needs a Suspense boundary.
	return (
		<Suspense>
			<InventoryView />
		</Suspense>
	);
}

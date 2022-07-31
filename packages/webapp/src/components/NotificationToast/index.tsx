import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks';

import toast, { Toaster } from 'react-hot-toast';
import { removePendingBidTx, removePendingSettleTx, resetPendingSettleTx } from '../../state/slices/mempool';
import { closeEthereumMempoolSocket, openEthereumMempoolSocket } from '../../middleware/alchemyMempoolWebsocket';
import dayjs from 'dayjs';
import MempoolToast from '../MempoolToast';

const NotificationToast: React.FC<{}> = props => {
  const dispatch = useAppDispatch();

  const activeAuction = useAppSelector(state => state.auction.activeAuction);
  const auctionEnd = useAppSelector(state => state.auction.auctionEnd);
  const pendingSettleTxs = useAppSelector(state => state.mempool.pendingSettleTxs);
  const pendingBidTxs = useAppSelector(state => state.mempool.pendingBidTxs);
  const listeningMempool = useAppSelector(state => state.mempool.listening);
  const prevSettledBlockHash = useAppSelector(state => state.settlement.prevSettledBlockHash);
  const blockhash = useAppSelector(state => state.block.blockHash);

  useEffect(() => {
    pendingSettleTxs.forEach(tx => {
        toast.custom(
          <MempoolToast tx={tx} />, 
            {
                position: "bottom-center",
                duration: 20000
            }
        )
        removePendingSettleTx({ hash: tx.hash });
    })
  }, [pendingSettleTxs]);

  useEffect(() => {
    pendingBidTxs.forEach(tx => {
      const closeToAuctionEnd = dayjs().add(5, "minutes").unix() >= auctionEnd ? true : false
      if (closeToAuctionEnd) {
        toast.custom(
          <MempoolToast tx={tx} />, 
          {
              position: "bottom-center",
              duration: 6000
          }
        )
      }
      //TODO: remove debug console outputs after testing
      console.log('call removePendingBidTx()')
      removePendingBidTx({ hash: tx.hash })
    })
  }, [pendingBidTxs, auctionEnd]);

  useEffect(() => {
    const lessThanMinTillAuctionEnd = auctionEnd && dayjs().add(6, 'minutes').unix() >= auctionEnd ? true : false
    if ((activeAuction === false || lessThanMinTillAuctionEnd) && !listeningMempool) {
      dispatch(openEthereumMempoolSocket())
    } else if (activeAuction === true && !lessThanMinTillAuctionEnd && listeningMempool) {
      dispatch(closeEthereumMempoolSocket())
    }
    // [..., blockhash] used to always check time till auction end
    // and ensure websocket will open as auction comes to an end
  }, [activeAuction, auctionEnd, listeningMempool, blockhash, dispatch]);

  useEffect(() => {
    if (prevSettledBlockHash) {
      toast.dismiss();
      dispatch(resetPendingSettleTx());
    }
  }, [prevSettledBlockHash, dispatch]);

  return (
    <Toaster
        reverseOrder={false}
    />
  )
};
export default NotificationToast;
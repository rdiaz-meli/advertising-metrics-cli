export default function numberFormat(number: number) {
  const [whole, decimal] = (number || 0).toString().split('.');
  const string = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return decimal ? `${string},${decimal}` : string;
}

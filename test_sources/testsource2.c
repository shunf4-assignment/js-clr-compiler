int main(void)
{
	int a;
	int b;
	int c;
	a=3;
	b=4;
	c=2;

  if (1)
  {
    int a;
    a=5;
    {
      int a;
      a = 3;
      if (a != 3)
      {
        int a;
        a = 9;
        return a + 2;
      } else {
        int a;
        a = 11;
        return a * 2;
      }
    }
  }
  return a + 3;
}
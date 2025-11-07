from sqlalchemy import Column, Integer, String, BigInteger, TIMESTAMP, func
from ..database import Base # Import Base from our database.py

class BehavioralEvent(Base):
    __tablename__ = "behavioral_events"

    # This is like 'id = models.AutoField(primary_key=True)'
    id = Column(Integer, primary_key=True, index=True)
    
    # This is like 'user_id = models.CharField(max_length=100, null=True)'
    user_id = Column(String(100), nullable=True) 
    
    event_type = Column(String(50))
    x = Column(Integer, nullable=True)
    y = Column(Integer, nullable=True)
    key = Column(String(20), nullable=True)
    timestamp = Column(BigInteger)
    
    # This is like 'received_at = models.DateTimeField(auto_now_add=True)'
    received_at = Column(TIMESTAMP, server_default=func.now())
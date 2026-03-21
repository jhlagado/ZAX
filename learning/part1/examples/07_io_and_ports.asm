; ZAX lowered .asm trace
; range: $0100..$8059 (end exclusive)

; func send_byte begin
send_byte:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push HL                        ; 010B: E5
out (OUT_PORT), A              ; 010C: D3 10
__zax_epilogue_0:
pop HL                         ; 010E: E1
pop DE                         ; 010F: D1
pop BC                         ; 0110: C1
pop AF                         ; 0111: F1
ld SP, IX                      ; 0112: DD F9
pop IX                         ; 0114: DD E1
ret                            ; 0116: C9
; func recv_byte begin
; func send_byte end
recv_byte:
push IX                        ; 0117: DD E5
ld IX, $0000                   ; 0119: DD 21 00 00
add IX, SP                     ; 011D: DD 39
push BC                        ; 011F: C5
push DE                        ; 0120: D5
push HL                        ; 0121: E5
in A, (IN_PORT)                ; 0122: DB 11
__zax_epilogue_1:
pop HL                         ; 0124: E1
pop DE                         ; 0125: D1
pop BC                         ; 0126: C1
ld SP, IX                      ; 0127: DD F9
pop IX                         ; 0129: DD E1
ret                            ; 012B: C9
; func echo_reg begin
; func recv_byte end
echo_reg:
push IX                        ; 012C: DD E5
ld IX, $0000                   ; 012E: DD 21 00 00
add IX, SP                     ; 0132: DD 39
push AF                        ; 0134: F5
push BC                        ; 0135: C5
push DE                        ; 0136: D5
push HL                        ; 0137: E5
ld C, OUT_PORT                 ; 0138: 0E 10
out (C), B                     ; 013A: ED 41
__zax_epilogue_2:
pop HL                         ; 013C: E1
pop DE                         ; 013D: D1
pop BC                         ; 013E: C1
pop AF                         ; 013F: F1
ld SP, IX                      ; 0140: DD F9
pop IX                         ; 0142: DD E1
ret                            ; 0144: C9
; func echo_reg end
; func poll_and_recv begin
poll_and_recv:
push IX                        ; 0145: DD E5
ld IX, $0000                   ; 0147: DD 21 00 00
add IX, SP                     ; 014B: DD 39
push BC                        ; 014D: C5
push DE                        ; 014E: D5
push HL                        ; 014F: E5
ld C, STATUS_PORT              ; 0150: 0E 12
poll_loop:
in A, (C)                      ; 0152: ED 78
and $0001                      ; 0154: E6 01
jr z poll_loop                 ; 0156: 28 00
in A, (IN_PORT)                ; 0158: DB 11
__zax_epilogue_3:
pop HL                         ; 015A: E1
pop DE                         ; 015B: D1
pop BC                         ; 015C: C1
ld SP, IX                      ; 015D: DD F9
pop IX                         ; 015F: DD E1
ret                            ; 0161: C9
; func poll_and_recv end
; func send_block begin
send_block:
push IX                        ; 0162: DD E5
ld IX, $0000                   ; 0164: DD 21 00 00
add IX, SP                     ; 0168: DD 39
push AF                        ; 016A: F5
push BC                        ; 016B: C5
push DE                        ; 016C: D5
push HL                        ; 016D: E5
block_loop:
ld A, (hl)                     ; 016E: 7E
out (C), A                     ; 016F: ED 79
inc HL                         ; 0171: 23
djnz block_loop                ; 0172: 10 00
__zax_epilogue_4:
pop HL                         ; 0174: E1
pop DE                         ; 0175: D1
pop BC                         ; 0176: C1
pop AF                         ; 0177: F1
ld SP, IX                      ; 0178: DD F9
pop IX                         ; 017A: DD E1
ret                            ; 017C: C9
; func main begin
; func send_block end
main:
push IX                        ; 017D: DD E5
ld IX, $0000                   ; 017F: DD 21 00 00
add IX, SP                     ; 0183: DD 39
push AF                        ; 0185: F5
push BC                        ; 0186: C5
push DE                        ; 0187: D5
push HL                        ; 0188: E5
ld A, $00AA                    ; 0189: 3E AA
call send_byte                 ; 018B: CD 00 00
call recv_byte                 ; 018E: CD 00 00
ld B, $0055                    ; 0191: 06 55
call echo_reg                  ; 0193: CD 00 00
ld HL, payload                 ; 0196: 21 00 00
ld B, PayloadLen               ; 0199: 06 04
ld C, OUT_PORT                 ; 019B: 0E 10
call send_block                ; 019D: CD 00 00
__zax_epilogue_5:
pop HL                         ; 01A0: E1
pop DE                         ; 01A1: D1
pop BC                         ; 01A2: C1
pop AF                         ; 01A3: F1
ld SP, IX                      ; 01A4: DD F9
pop IX                         ; 01A6: DD E1
ret                            ; 01A8: C9
; func main end

; symbols:
; label send_byte = $0100
; label __zax_epilogue_0 = $010E
; label recv_byte = $0117
; label __zax_epilogue_1 = $0124
; label echo_reg = $012C
; label __zax_epilogue_2 = $013C
; label poll_and_recv = $0145
; label poll_loop = $0152
; label __zax_epilogue_3 = $015A
; label send_block = $0162
; label block_loop = $016E
; label __zax_epilogue_4 = $0174
; label main = $017D
; label __zax_epilogue_5 = $01A0
; data payload = $8000
; label __zax_startup = $8004
; constant IN_PORT = $0011 (17)
; constant OUT_PORT = $0010 (16)
; constant PayloadLen = $0004 (4)
; constant STATUS_PORT = $0012 (18)

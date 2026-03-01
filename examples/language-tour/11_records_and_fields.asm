; ZAX lowered .asm trace
; range: $0100..$01A2 (end exclusive)

; func write_pair begin
write_pair:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push HL                        ; 010B: E5
push DE                        ; 010C: D5
push HL                        ; 010D: E5
ld E, (IX + $0004)             ; 010E: DD 5E 04
ld D, (IX + $0005)             ; 0111: DD 56 05
ld HL, $0000                   ; 0114: 21 00 00
add HL, DE                     ; 0117: 19
ld A, (HL)                     ; 0118: 7E
pop HL                         ; 0119: E1
pop DE                         ; 011A: D1
push DE                        ; 011B: D5
push HL                        ; 011C: E5
ld de, pair_buf                ; 011D: 11 00 00
ld HL, $0000                   ; 0120: 21 00 00
add HL, DE                     ; 0123: 19
ld (HL), A                     ; 0124: 77
pop HL                         ; 0125: E1
pop DE                         ; 0126: D1
push DE                        ; 0127: D5
push HL                        ; 0128: E5
ld E, (IX + $0006)             ; 0129: DD 5E 06
ld D, (IX + $0007)             ; 012C: DD 56 07
ld HL, $0000                   ; 012F: 21 00 00
add HL, DE                     ; 0132: 19
ld A, (HL)                     ; 0133: 7E
pop HL                         ; 0134: E1
pop DE                         ; 0135: D1
push DE                        ; 0136: D5
push HL                        ; 0137: E5
ld de, pair_buf                ; 0138: 11 00 00
ld HL, $0001                   ; 013B: 21 01 00
add HL, DE                     ; 013E: 19
ld (HL), A                     ; 013F: 77
pop HL                         ; 0140: E1
pop DE                         ; 0141: D1
__zax_epilogue_0:
pop HL                         ; 0142: E1
pop DE                         ; 0143: D1
pop BC                         ; 0144: C1
pop AF                         ; 0145: F1
ld SP, IX                      ; 0146: DD F9
pop IX                         ; 0148: DD E1
ret                            ; 014A: C9
; func read_pair_word begin
; func write_pair end
read_pair_word:
push IX                        ; 014B: DD E5
ld IX, $0000                   ; 014D: DD 21 00 00
add IX, SP                     ; 0151: DD 39
push AF                        ; 0153: F5
push BC                        ; 0154: C5
push DE                        ; 0155: D5
push DE                        ; 0156: D5
push HL                        ; 0157: E5
ld de, pair_buf                ; 0158: 11 00 00
ld HL, $0000                   ; 015B: 21 00 00
add HL, DE                     ; 015E: 19
ld E, (HL)                     ; 015F: 5E
pop HL                         ; 0160: E1
ld L, E                        ; 0161: 6B
pop DE                         ; 0162: D1
push DE                        ; 0163: D5
push HL                        ; 0164: E5
ld de, pair_buf                ; 0165: 11 00 00
ld HL, $0001                   ; 0168: 21 01 00
add HL, DE                     ; 016B: 19
ld E, (HL)                     ; 016C: 5E
pop HL                         ; 016D: E1
ld H, E                        ; 016E: 63
pop DE                         ; 016F: D1
__zax_epilogue_1:
pop DE                         ; 0170: D1
pop BC                         ; 0171: C1
pop AF                         ; 0172: F1
ld SP, IX                      ; 0173: DD F9
pop IX                         ; 0175: DD E1
ret                            ; 0177: C9
; func main begin
; func read_pair_word end
main:
push IX                        ; 0178: DD E5
ld IX, $0000                   ; 017A: DD 21 00 00
add IX, SP                     ; 017E: DD 39
push AF                        ; 0180: F5
push BC                        ; 0181: C5
push DE                        ; 0182: D5
push HL                        ; 0183: E5
ld HL, $0002                   ; 0184: 21 02 00
push HL                        ; 0187: E5
ld HL, $0001                   ; 0188: 21 01 00
push HL                        ; 018B: E5
call write_pair                ; 018C: CD 00 00
inc SP                         ; 018F: 33
inc SP                         ; 0190: 33
inc SP                         ; 0191: 33
inc SP                         ; 0192: 33
ld A, (pair_buf)               ; 0193: 3A 00 00
call read_pair_word            ; 0196: CD 00 00
__zax_epilogue_2:
pop HL                         ; 0199: E1
pop DE                         ; 019A: D1
pop BC                         ; 019B: C1
pop AF                         ; 019C: F1
ld SP, IX                      ; 019D: DD F9
pop IX                         ; 019F: DD E1
ret                            ; 01A1: C9
; func main end

; symbols:
; label write_pair = $0100
; label __zax_epilogue_0 = $0142
; label read_pair_word = $014B
; label __zax_epilogue_1 = $0170
; label main = $0178
; label __zax_epilogue_2 = $0199
; var pair_buf = $01A2

; ZAX lowered .asm trace
; range: $0100..$0162 (end exclusive)

; func read_counter begin
read_counter:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld HL, (counter)               ; 010B: 2A 00 00
__zax_epilogue_0:
pop DE                         ; 010E: D1
pop BC                         ; 010F: C1
pop AF                         ; 0110: F1
ld SP, IX                      ; 0111: DD F9
pop IX                         ; 0113: DD E1
ret                            ; 0115: C9
; func read_counter end
; func write_counter begin
write_counter:
push IX                        ; 0116: DD E5
ld IX, $0000                   ; 0118: DD 21 00 00
add IX, SP                     ; 011C: DD 39
push AF                        ; 011E: F5
push BC                        ; 011F: C5
push DE                        ; 0120: D5
push HL                        ; 0121: E5
push DE                        ; 0122: D5
push IX                        ; 0123: DD E5
pop HL                         ; 0125: E1
ld DE, $0004                   ; 0126: 11 04 00
add HL, DE                     ; 0129: 19
push HL                        ; 012A: E5
pop DE                         ; 012B: D1
ld a, (hl) ; inc hl ; ld h, (hl) ; ld l, a ; 012C: 7E 23 66 6F
push HL                        ; 0130: E5
ld HL, counter                 ; 0131: 21 00 00
pop DE                         ; 0134: D1
ld (hl), e ; inc hl ; ld (hl), d ; 0135: 73 23 72
__zax_epilogue_1:
pop HL                         ; 0138: E1
pop DE                         ; 0139: D1
pop BC                         ; 013A: C1
pop AF                         ; 013B: F1
ld SP, IX                      ; 013C: DD F9
pop IX                         ; 013E: DD E1
ret                            ; 0140: C9
; func main begin
; func write_counter end
main:
push IX                        ; 0141: DD E5
ld IX, $0000                   ; 0143: DD 21 00 00
add IX, SP                     ; 0147: DD 39
push AF                        ; 0149: F5
push BC                        ; 014A: C5
push DE                        ; 014B: D5
push HL                        ; 014C: E5
ld HL, $007B                   ; 014D: 21 7B 00
push HL                        ; 0150: E5
call write_counter             ; 0151: CD 00 00
inc SP                         ; 0154: 33
inc SP                         ; 0155: 33
ld HL, (counter)               ; 0156: 2A 00 00
__zax_epilogue_2:
pop HL                         ; 0159: E1
pop DE                         ; 015A: D1
pop BC                         ; 015B: C1
pop AF                         ; 015C: F1
ld SP, IX                      ; 015D: DD F9
pop IX                         ; 015F: DD E1
ret                            ; 0161: C9
; func main end

; symbols:
; label read_counter = $0100
; label __zax_epilogue_0 = $010E
; label write_counter = $0116
; label __zax_epilogue_1 = $0138
; label main = $0141
; label __zax_epilogue_2 = $0159
; var counter = $0162
